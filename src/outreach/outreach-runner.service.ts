import { Inject, Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { BrowserService } from '../browser/browser.service';
import { Human } from '../common/human';
import { BOT_CONFIG } from '../config/bot-config';
import type { BotConfig } from '../config/bot-config';
import { detectBlock } from '../limits/block-detector';
import { canContact } from '../limits/rate-limit';
import { copyPostLink } from '../linkedin/post-link';
import { ProfileActions } from '../linkedin/profile-actions';
import { extractRole } from '../posts/extract-role';
import { buildMessage } from '../posts/message';
import { CARD, readCard } from '../posts/post-cards';
import { PostsService } from '../posts/posts.service';
import { OutreachStore } from '../store/outreach-store';
import type { OutreachRow } from '../store/outreach-store';
import { screenCard } from './screen-card';

export type RunOptions = { dryRun: boolean; maxContacts?: number };

export type RunSummary = {
  startedAt: string;
  finishedAt?: string;
  dryRun: boolean;
  terms: string[];
  seen: number;
  candidates: number;
  invited: number;
  messaged: number;
  followUps: number;
  skipped: number;
  stopReason?: string;
};

export type RunnerState = {
  status: 'idle' | 'running' | 'stopping' | 'blocked';
  current?: RunSummary;
  lastRun?: RunSummary;
  block?: { reason: string; at: string; url: string };
  log: string[];
};

@Injectable()
export class OutreachRunner {
  private readonly logger = new Logger(OutreachRunner.name);
  private readonly human: Human;
  private termIndex = 0;
  private stopRequested = false;
  readonly state: RunnerState = { status: 'idle', log: [] };

  constructor(
    private readonly browser: BrowserService,
    private readonly posts: PostsService,
    private readonly store: OutreachStore,
    @Inject(BOT_CONFIG) private readonly config: BotConfig,
  ) {
    this.human = new Human(config.pace);
  }

  start(options: RunOptions): { started: boolean; reason?: string } {
    if (this.state.status === 'running' || this.state.status === 'stopping') {
      return { started: false, reason: 'já está rodando' };
    }
    if (this.state.status === 'blocked') {
      return {
        started: false,
        reason: `bloqueado: ${this.state.block?.reason} — use /unblock depois de conferir a conta`,
      };
    }
    void this.run(options);
    return { started: true };
  }

  async inspectMessage(profileUrl: string) {
    if (this.state.status === 'running' || this.state.status === 'stopping') {
      return { error: 'rodada em andamento' };
    }
    const tab = await this.browser.getProfileTab();
    const profile = new ProfileActions(tab, this.human);
    await profile.open(profileUrl);
    return profile.inspectMessageBox();
  }

  stop(): void {
    if (this.state.status === 'running') {
      this.stopRequested = true;
      this.state.status = 'stopping';
      this.note('⏹️ parada pedida — termina o post atual e sai');
    }
  }

  unblock(): void {
    if (this.state.status === 'blocked') {
      this.state.status = 'idle';
      this.note('🔓 desbloqueado manualmente');
    }
  }

  private async run({ dryRun, maxContacts }: RunOptions): Promise<void> {
    this.stopRequested = false;
    this.state.status = 'running';
    const summary: RunSummary = {
      startedAt: new Date().toISOString(),
      dryRun,
      terms: [],
      seen: 0,
      candidates: 0,
      invited: 0,
      messaged: 0,
      followUps: 0,
      skipped: 0,
    };
    this.state.current = summary;
    this.note(
      `▶️ rodada começou${dryRun ? ' (DRY-RUN: não convida nem manda mensagem)' : ''}`,
    );

    try {
      const page = await this.browser.getPage();
      await this.followUpPending(page, summary, dryRun);
      if (this.isBlocked()) return;

      for (
        let n = 0;
        n < this.config.termsPerRun && !this.shouldStop(summary, maxContacts);
        n++
      ) {
        const term =
          this.config.searchTerms[
            this.termIndex % this.config.searchTerms.length
          ];
        this.termIndex++;
        summary.terms.push(term);

        await this.posts.openSearch(term);
        if (await this.checkBlock(page, summary)) return;
        await this.human.browse(page);

        for (const card of await page.locator(CARD).all()) {
          if (this.shouldStop(summary, maxContacts)) break;
          await this.safely('post', () =>
            this.handleCard(page, card, summary, dryRun),
          );
          if (this.isBlocked()) return;
        }
      }
      summary.stopReason ??= this.stopRequested
        ? 'parado pelo usuário'
        : 'terminou os termos da rodada';
    } catch (error) {
      summary.stopReason = `erro: ${(error as Error).message}`;
      this.logger.error(summary.stopReason);
    } finally {
      summary.finishedAt = new Date().toISOString();
      this.state.lastRun = summary;
      this.state.current = undefined;
      if (!this.isBlocked()) this.state.status = 'idle';
      this.note(
        `✅ rodada fim: ${summary.messaged} mensagens (+${summary.followUps} pendentes), ${summary.invited} só convite, ${summary.skipped} pulados — ${summary.stopReason}`,
      );
    }
  }

  private async followUpPending(
    page: Page,
    summary: RunSummary,
    dryRun: boolean,
  ): Promise<void> {
    for (const pending of this.store.pendingMessages(new Date())) {
      if (this.stopRequested || this.isBlocked()) break;
      await this.safely(pending.name, () =>
        this.followUpOne(page, pending, summary, dryRun),
      );
    }
  }

  private async followUpOne(
    page: Page,
    pending: OutreachRow,
    summary: RunSummary,
    dryRun: boolean,
  ): Promise<void> {
    this.note(`💬 mensagem pendente: ${pending.name}`);
    const tab = await this.browser.getProfileTab();
    const profile = new ProfileActions(tab, this.human);
    await profile.open(pending.profileUrl);
    if (await this.checkBlock(tab, summary)) return;
    const message = buildMessage({
      name: pending.name,
      postUrl: pending.postUrl,
      kind: pending.kind === 'relocation' ? 'relocation' : 'remote',
      years: this.config.yearsOfExperience,
    });
    const sent = await profile.sendMessage(message, dryRun, {
      onlyConnections: true,
    });
    if (!dryRun) this.store.markChecked(pending.profileUrl, new Date());
    this.note(`   💬 mensagem: ${sent}`);
    if (sent === 'no-box' || sent === 'text-mismatch') {
      this.note(`   📸 ${await profile.screenshot(`followup-${sent}`)}`);
    }
    await page.bringToFront().catch(() => null);
    if (!dryRun && (sent === 'sent' || sent === 'sent?')) {
      this.store.markMessaged(pending.profileUrl, new Date());
      summary.followUps++;
    }
    await this.human.pause(10_000, 25_000);
  }

  private async handleCard(
    page: Page,
    card: ReturnType<Page['locator']>,
    summary: RunSummary,
    dryRun: boolean,
  ): Promise<void> {
    const more = card.locator('[data-testid="expandable-text-button"]').first();
    if (await more.isVisible().catch(() => false)) {
      await card.scrollIntoViewIfNeeded().catch(() => null);
      await this.human.pause(500, 1200);
      await more.click({ timeout: 4000 }).catch(() => null);
      await this.human.pause(1200, 2500);
    }

    const info = await readCard(card);
    summary.seen++;
    const screening = screenCard(
      info,
      this.store.wasContacted(info.profileUrl),
    );
    if (!screening.ok) {
      this.logger.debug(`⏭️ ${info.name || '?'}: ${screening.reason}`);
      return;
    }

    const limit = canContact(this.store.usage(new Date()), this.config.limits);
    if (!limit.ok) {
      summary.stopReason = limit.reason;
      this.stopRequested = true;
      return;
    }

    summary.candidates++;
    await this.human.pause(1500, 3500);
    const postUrl = await copyPostLink(page, card);
    if (!postUrl) {
      this.note(`⏭️ ${info.name}: não consegui o link do post`);
      return;
    }

    const role = extractRole(info.text);
    const message = buildMessage({
      name: info.name,
      role,
      postUrl,
      kind: screening.kind,
      years: this.config.yearsOfExperience,
    });
    this.note(`▶️ ${info.name} [${screening.kind}] ${role ?? ''} — ${postUrl}`);

    await this.human.pause(2000, 5000);
    const tab = await this.browser.getProfileTab();
    const profile = new ProfileActions(tab, this.human);
    await profile.open(info.profileUrl);
    if (await this.checkBlock(tab, summary)) return;

    let connect = await profile.connect(info.name, dryRun);
    let sent = await profile.sendMessage(message, dryRun);
    if (connect === 'no-button' && sent === 'no-button') {
      this.note(
        `   🐛 botões no topo: ${JSON.stringify(profile.lastTopActions)} — 📸 ${await profile.screenshot('no-button')}`,
      );
      this.note('   🔁 recarregando o perfil e tentando de novo');
      await profile.open(info.profileUrl);
      if (await this.checkBlock(tab, summary)) return;
      connect = await profile.connect(info.name, dryRun);
      sent = await profile.sendMessage(message, dryRun);
    }
    this.note(`   🤝 convite: ${connect} | 💬 mensagem: ${sent}`);
    if (sent === 'no-box' || sent === 'text-mismatch') {
      this.note(`   📸 ${await profile.screenshot(`msg-${sent}`)}`);
    }
    await page.bringToFront().catch(() => null);

    if (dryRun) return;

    const entry = {
      profileUrl: info.profileUrl,
      name: info.name,
      kind: screening.kind,
      postUrl,
    };
    if (sent === 'sent' || sent === 'sent?') {
      this.store.record(entry, new Date(), 'messaged');
      summary.messaged++;
    } else if (
      connect === 'invited' ||
      connect === 'invited?' ||
      connect === 'pending' ||
      connect === 'connected'
    ) {
      this.store.record(entry, new Date(), 'invited');
      summary.invited++;
    } else {
      this.store.record(entry, new Date(), 'skipped');
      summary.skipped++;
    }

    await this.human.pause(10_000, 30_000);
  }

  private async checkBlock(page: Page, summary: RunSummary): Promise<boolean> {
    const text = await page
      .locator('body')
      .innerText({ timeout: 5000 })
      .catch(() => '');
    const check = detectBlock(page.url(), text);
    if (!check.blocked) return false;

    this.state.status = 'blocked';
    this.state.block = {
      reason: check.reason,
      at: new Date().toISOString(),
      url: page.url(),
    };
    summary.stopReason = `🚫 bloqueio do LinkedIn: ${check.reason}`;
    this.note(summary.stopReason);
    return true;
  }

  private isBlocked(): boolean {
    return this.state.status === 'blocked';
  }

  private async safely(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      this.note(`⚠️ ${label}: ${(error as Error).message.split('\n')[0]}`);
      await this.human.pause(3000, 6000);
    }
  }

  private shouldStop(summary: RunSummary, maxContacts?: number): boolean {
    if (this.stopRequested) return true;
    if (
      maxContacts !== undefined &&
      summary.messaged + summary.invited >= maxContacts
    ) {
      summary.stopReason ??= `chegou no máximo da rodada (${maxContacts})`;
      return true;
    }
    return false;
  }

  private note(line: string): void {
    this.logger.log(line);
    this.state.log.push(`${new Date().toLocaleTimeString('pt-BR')} ${line}`);
    if (this.state.log.length > 100) this.state.log.shift();
  }
}
