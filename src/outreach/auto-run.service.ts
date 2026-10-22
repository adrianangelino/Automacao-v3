import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { BOT_CONFIG } from '../config/bot-config';
import type { BotConfig } from '../config/bot-config';
import { isWithinHours, nextRunAt } from './auto-run';
import { OutreachRunner } from './outreach-runner.service';

@Injectable()
export class AutoRunService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoRunService.name);
  private timer?: NodeJS.Timeout;
  enabled: boolean;
  nextRun?: Date;
  lastResult?: { at: string; result: string };

  constructor(
    private readonly runner: OutreachRunner,
    @Inject(BOT_CONFIG) private readonly config: BotConfig,
  ) {
    this.enabled = config.autoRun.enabled;
  }

  onModuleInit() {
    if (this.enabled) this.schedule();
  }

  onModuleDestroy() {
    clearTimeout(this.timer);
  }

  turnOn(): void {
    this.enabled = true;
    this.schedule();
  }

  turnOff(): void {
    this.enabled = false;
    clearTimeout(this.timer);
    this.nextRun = undefined;
  }

  status() {
    const { everyMinutes, startHour, endHour, maxPerRun, live } =
      this.config.autoRun;
    return {
      enabled: this.enabled,
      nextRun: this.nextRun?.toLocaleString('pt-BR'),
      everyMinutes,
      hours: `${startHour}-${endHour}`,
      maxPerRun,
      live,
      lastResult: this.lastResult,
    };
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.nextRun = nextRunAt(new Date(), this.config.autoRun);
    this.logger.log(
      `⏰ próxima rodada automática: ${this.nextRun.toLocaleString('pt-BR')}`,
    );
    this.timer = setTimeout(
      () => this.fire(),
      this.nextRun.getTime() - Date.now(),
    );
  }

  private fire(): void {
    if (!this.enabled) return;
    const now = new Date();
    if (isWithinHours(now, this.config.autoRun)) {
      const started = this.runner.start({
        dryRun: !this.config.autoRun.live,
        maxContacts: this.config.autoRun.maxPerRun,
      });
      this.lastResult = {
        at: now.toLocaleString('pt-BR'),
        result: started.started ? 'rodada iniciada' : (started.reason ?? ''),
      };
      this.logger.log(`⏰ ${this.lastResult.result}`);
    }
    this.schedule();
  }
}
