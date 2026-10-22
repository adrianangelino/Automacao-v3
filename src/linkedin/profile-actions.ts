import { mkdirSync } from 'fs';
import { Locator, Page } from 'playwright';
import { Human } from '../common/human';

export type ConnectResult =
  'invited' | 'invited?' | 'pending' | 'connected' | 'no-button' | 'dry';
export type MessageResult =
  | 'not-connected'
  | 'sent'
  | 'sent?'
  | 'no-button'
  | 'no-box'
  | 'no-credits'
  | 'text-mismatch'
  | 'dry';

type TopAction = { i: number; label: string; text: string };

export class ProfileActions {
  lastTopActions: string[] = [];

  constructor(
    private readonly page: Page,
    private readonly human: Human,
  ) {}

  async open(profileUrl: string): Promise<void> {
    await this.page.goto(profileUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 40_000,
    });
    await this.page
      .waitForSelector('main', { timeout: 15_000 })
      .catch(() => null);
    await this.page.waitForTimeout(5000 + Math.floor(Math.random() * 2500));
    await this.human.scroll(this.page, 'down', 350 + Math.random() * 300);
    await this.human.pause(3000, 7000);
    await this.page
      .evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
      .catch(() => null);
    await this.page
      .waitForFunction(() => window.scrollY === 0, null, { timeout: 5000 })
      .catch(() => null);
    await this.human.pause(1500, 3000);
  }

  async connect(name: string, dryRun: boolean): Promise<ConnectResult> {
    if (await this.isConnected()) return 'connected';
    if (await this.isPending()) return 'pending';

    const firstName = (name.split(/\s+/)[0] ?? '').toLowerCase();
    const direct = await this.findTopAction(
      (a) =>
        (/^(Invite .+ to connect|Convidar .+ para se conectar)$/i.test(
          a.label,
        ) &&
          a.label.toLowerCase().includes(firstName)) ||
        /^(Connect|Conectar)$/i.test(a.text),
    );

    if (direct) {
      if (dryRun) return 'dry';
      await direct.click({ timeout: 8000 }).catch(() => null);
    } else {
      const more = await this.findTopAction((a) =>
        /^(More|More actions|Mais|Mais ações)$/i.test(a.label || a.text),
      );
      if (!more) return 'no-button';
      await more.click({ timeout: 6000 }).catch(() => null);
      const item = this.page
        .locator(
          '[role="menuitem"], [role="menu"] button, .artdeco-dropdown__content-inner [role="button"]',
        )
        .filter({ hasText: /^\s*(Connect|Conectar)\s*$/i })
        .first();
      const found = await item
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!found || dryRun) {
        await this.page.keyboard.press('Escape').catch(() => null);
        return found ? 'dry' : 'no-button';
      }
      await item.click({ timeout: 6000 }).catch(() => null);
    }

    await this.page.waitForTimeout(1500);
    const send = this.visibleButton(
      /^\s*(Send without a note|Enviar sem nota|Send invitation|Enviar convite|Send|Enviar)\s*$/i,
    );
    if (
      await send
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => true)
        .catch(() => false)
    ) {
      await send.click({ timeout: 6000 }).catch(() => null);
      await this.page.waitForTimeout(2500);
      return (await this.isPending()) ? 'invited' : 'invited?';
    }
    if (await this.isPending()) return 'invited';
    await this.page.keyboard.press('Escape').catch(() => null);
    return 'no-button';
  }

  async sendMessage(
    text: string,
    dryRun: boolean,
    { onlyConnections = false } = {},
  ): Promise<MessageResult> {
    if (onlyConnections && !(await this.isConnected())) return 'not-connected';
    const button = await this.findTopAction(
      (a) =>
        /^(Message|Mensagem|Enviar mensagem)$/i.test(a.text) ||
        /^Message .+/i.test(a.label),
    );
    if (!button) return 'no-button';
    if (dryRun) return 'dry';

    await this.human.pause(3000, 6000);
    const box = this.page
      .locator('.msg-form__contenteditable')
      .filter({ visible: true })
      .last();
    const boxVisible = () =>
      box
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
    await button.click({ timeout: 8000 }).catch(() => null);
    if (await this.closeInMailUpsell()) return 'no-credits';
    if (!(await boxVisible())) {
      if (await this.closeInMailUpsell()) return 'no-credits';
      await this.page.waitForTimeout(3000);
      const retry = await this.findTopAction(
        (a) =>
          /^(Message|Mensagem|Enviar mensagem)$/i.test(a.text) ||
          /^Message .+/i.test(a.label),
      );
      await retry?.click({ timeout: 8000 }).catch(() => null);
      if (!(await boxVisible())) return 'no-box';
    }

    const overlay = await this.page
      .locator('.msg-overlay-conversation-bubble, .msg-overlay-bubble')
      .filter({ visible: true })
      .last()
      .innerText()
      .catch(() => '');
    if (
      /out of InMail|no InMail credits|\b0 InMail credits|buy InMail|get more InMail/i.test(
        overlay,
      )
    ) {
      await this.closeDraft();
      return 'no-credits';
    }

    if (
      !(await this.typeInto(box, text)) &&
      !(await this.typeInto(box, text))
    ) {
      await this.closeDraft();
      return 'text-mismatch';
    }

    const sendButton = this.page
      .locator('.msg-form__send-btn, button.msg-form__send-button')
      .filter({ visible: true })
      .last();
    const enabled = await sendButton
      .isEnabled({ timeout: 6000 })
      .catch(() => false);
    if (!enabled) {
      await this.closeDraft();
      return 'no-box';
    }
    await this.human.pause(2500, 5000);
    await sendButton.click({ timeout: 6000 }).catch(() => null);
    await this.page.waitForTimeout(3500);
    const left = (await box.innerText().catch(() => '')).trim();
    await this.closeDraft();
    return left.length < 5 ? 'sent' : 'sent?';
  }

  async inspectMessageBox(): Promise<Record<string, unknown>> {
    const button = await this.findTopAction(
      (a) =>
        /^(Message|Mensagem|Enviar mensagem)$/i.test(a.text) ||
        /^Message .+/i.test(a.label),
    );
    if (!button) return { button: false, topActions: this.lastTopActions };

    const href = await button.getAttribute('href').catch(() => null);
    await button.click({ timeout: 8000 }).catch(() => null);
    await this.page.waitForTimeout(6000);
    const screenshot = await this.screenshot('inspect-message');
    const info = {
      button: true,
      href,
      urlAfterClick: this.page.url(),
      boxes: await this.page.locator('.msg-form__contenteditable').count(),
      visibleBoxes: await this.page
        .locator('.msg-form__contenteditable')
        .filter({ visible: true })
        .count(),
      editables: await this.page
        .locator('[contenteditable="true"]')
        .filter({ visible: true })
        .count(),
      overlay: (
        await this.page
          .locator('.msg-overlay-conversation-bubble, .msg-overlay-bubble')
          .filter({ visible: true })
          .last()
          .innerText({ timeout: 2000 })
          .catch(() => '')
      ).slice(0, 400),
      dialogs: (
        await this.page
          .locator('[role="dialog"]')
          .filter({ visible: true })
          .allInnerTexts()
          .catch((): string[] => [])
      ).map((t) => t.slice(0, 300)),
      screenshot,
    };
    await this.closeDraft();
    return info;
  }

  async screenshot(name: string): Promise<string> {
    mkdirSync('data/debug', { recursive: true });
    const path = `data/debug/${new Date().toISOString().replace(/[:.]/g, '-')}-${name}.png`;
    await this.page.screenshot({ path }).catch(() => null);
    return path;
  }

  private async typeInto(box: Locator, text: string): Promise<boolean> {
    const subject = this.page
      .locator('input[name="subject"]')
      .filter({ visible: true })
      .last();
    if (
      (await subject.count().catch(() => 0)) > 0 &&
      (await subject.inputValue().catch(() => ''))
    ) {
      await subject.fill('').catch(() => null);
    }
    await box.click({ timeout: 6000 }).catch(() => null);
    await box.focus().catch(() => null);
    const focused = await box
      .evaluate((el) => {
        const root = el.getRootNode() as Document | ShadowRoot;
        const active = root.activeElement ?? document.activeElement;
        return active === el || el.contains(active);
      })
      .catch(() => false);
    if (!focused) return false;

    await this.page.keyboard.press('Control+A').catch(() => null);
    await this.page.keyboard.press('Delete').catch(() => null);
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i])
        await this.page.keyboard.type(lines[i], {
          delay: 35 + Math.floor(Math.random() * 55),
        });
      if (i < lines.length - 1) await this.page.keyboard.press('Shift+Enter');
      await this.page.waitForTimeout(150);
    }
    if (
      (await subject.count().catch(() => 0)) > 0 &&
      (await subject.inputValue().catch(() => ''))
    )
      return false;

    await this.page.waitForTimeout(1000);
    const norm = (t: string) => t.replace(/\s+/g, ' ').trim();
    return norm(await box.innerText().catch(() => '')) === norm(text);
  }

  private async closeDraft(): Promise<void> {
    const close = this.visibleButton(/^\s*Close your (draft )?conversation/i);
    if ((await close.count().catch(() => 0)) > 0)
      await close.click({ timeout: 4000 }).catch(() => null);
    else await this.page.keyboard.press('Escape').catch(() => null);
    const discard = this.visibleButton(/^\s*(Discard|Descartar)\s*$/i);
    if ((await discard.count().catch(() => 0)) > 0)
      await discard.click({ timeout: 3000 }).catch(() => null);
  }

  private async closeInMailUpsell(): Promise<boolean> {
    const upsell = this.page
      .locator('[role="dialog"]')
      .filter({ hasText: /Get more InMail credits|Upgrade your plan/i })
      .filter({ visible: true })
      .first();
    const shown = await upsell
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (!shown) return false;
    const close = upsell
      .locator('button[aria-label*="Dismiss"], button[aria-label*="Close"]')
      .first();
    if ((await close.count().catch(() => 0)) > 0) {
      await close.click({ timeout: 4000 }).catch(() => null);
    } else {
      await this.page.keyboard.press('Escape').catch(() => null);
    }
    return true;
  }

  private async isConnected(): Promise<boolean> {
    const top = await this.page
      .locator('main')
      .first()
      .innerText({ timeout: 8000 })
      .catch(() => '');
    return /·\s*1st\b|\b1st degree\b/i.test(top.slice(0, 1500));
  }

  private async isPending(): Promise<boolean> {
    return !!(await this.findTopAction(
      (a) => /^(Pending|Pendente)$/i.test(a.text) || /^Pending,/i.test(a.label),
    ));
  }

  private visibleButton(text: RegExp): Locator {
    return this.page
      .locator('button')
      .filter({ hasText: text })
      .filter({ visible: true })
      .last();
  }

  private async findTopAction(
    test: (a: TopAction) => boolean,
  ): Promise<Locator | null> {
    let actions = await this.topCardActions();
    if (!actions.length) {
      await this.page.waitForTimeout(2500);
      actions = await this.topCardActions();
    }
    this.lastTopActions = actions.map((a) => a.label || a.text);
    const hit = actions.find(test);
    return hit ? this.page.locator(`[data-bot-top="${hit.i}"]`).first() : null;
  }

  private async topCardActions(): Promise<TopAction[]> {
    await this.page
      .evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      .catch(() => null);
    await this.page
      .waitForFunction(() => window.scrollY === 0, null, { timeout: 4000 })
      .catch(() => null);
    await this.page.waitForTimeout(500);
    return this.page
      .evaluate(() => {
        document
          .querySelectorAll('[data-bot-top]')
          .forEach((e) => e.removeAttribute('data-bot-top'));
        const main = document.querySelector('main');
        if (!main) return [];
        const mainLeft = main.getBoundingClientRect().left;
        const out: { i: number; label: string; text: string }[] = [];
        main.querySelectorAll<HTMLElement>('button, a').forEach((e) => {
          const r = e.getBoundingClientRect();
          const top = r.top + window.scrollY;
          if (r.width === 0 || top < 0 || top > 700 || r.left > mainLeft + 760)
            return;
          const i = out.length;
          e.setAttribute('data-bot-top', String(i));
          out.push({
            i,
            label: e.getAttribute('aria-label') ?? '',
            text: (e.innerText ?? '').trim().slice(0, 40),
          });
        });
        return out;
      })
      .catch(() => []);
  }
}
