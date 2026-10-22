import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { chromium, BrowserContext, Page } from 'playwright';
import { BOT_CONFIG } from '../config/bot-config';
import type { BotConfig } from '../config/bot-config';
import { installClipboardHook } from '../linkedin/post-link';

@Injectable()
export class BrowserService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserService.name);
  private context?: BrowserContext;
  private page?: Page;
  private profileTab?: Page;

  constructor(@Inject(BOT_CONFIG) private readonly config: BotConfig) {}

  async waitForLogin(): Promise<boolean> {
    const page = await this.getPage();
    await page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'domcontentloaded',
    });

    if (page.url().includes('/feed')) {
      this.logger.log('já estava logado.');
      return true;
    }

    this.logger.warn('faça o login no linkedIn na janela do chromiun...');
    await page.waitForURL('**/feed/**', { timeout: 5 * 60_000 });
    this.logger.log('Login detectado');
    return true;
  }

  async getPage(): Promise<Page> {
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }

    const context = await this.getContext();
    this.page = context.pages()[0] ?? (await context.newPage());
    return this.page;
  }

  async getProfileTab(): Promise<Page> {
    if (this.profileTab && !this.profileTab.isClosed()) {
      return this.profileTab;
    }
    const context = await this.getContext();
    this.profileTab = await context.newPage();
    return this.profileTab;
  }

  isOpen(): boolean {
    return !!this.context;
  }

  async onModuleDestroy() {
    await this.context?.close();
  }

  private async getContext(): Promise<BrowserContext> {
    if (this.context) return this.context;

    this.logger.log('Abrindo o chrome...');
    this.context = await chromium.launchPersistentContext(
      this.config.chromeProfileDir,
      {
        headless: false,
        viewport: { width: 1280, height: 800 },
        locale: 'en-US',
      },
    );
    await installClipboardHook(this.context);
    this.context.on('close', () => {
      this.context = undefined;
      this.page = undefined;
      this.profileTab = undefined;
    });
    return this.context;
  }
}
