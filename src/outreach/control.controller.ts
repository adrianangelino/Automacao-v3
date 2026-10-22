import { Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { BOT_CONFIG } from '../config/bot-config';
import type { BotConfig } from '../config/bot-config';
import { OutreachStore } from '../store/outreach-store';
import { AutoRunService } from './auto-run.service';
import { OutreachRunner } from './outreach-runner.service';

@Controller()
export class ControlController {
  constructor(
    private readonly runner: OutreachRunner,
    private readonly auto: AutoRunService,
    private readonly store: OutreachStore,
    @Inject(BOT_CONFIG) private readonly config: BotConfig,
  ) {}

  @Get('status')
  status() {
    return {
      status: this.runner.state.status,
      auto: this.auto.status(),
      usage: this.store.usage(new Date()),
      limits: this.config.limits,
      totals: this.store.totals(),
      current: this.runner.state.current,
      lastRun: this.runner.state.lastRun,
      block: this.runner.state.block,
      log: this.runner.state.log.slice(-20),
    };
  }

  @Get('recent')
  recent(@Query('limit') limit?: string) {
    return this.store.recent(Number(limit) || 10);
  }

  @Post('run')
  run(@Query('live') live?: string, @Query('max') max?: string) {
    const maxContacts =
      max !== undefined && Number(max) > 0 ? Number(max) : undefined;
    return this.runner.start({ dryRun: live !== 'true', maxContacts });
  }

  @Post('debug/message')
  inspectMessage(@Query('profile') profile: string) {
    return this.runner.inspectMessage(profile);
  }

  @Post('auto/on')
  autoOn() {
    this.auto.turnOn();
    return this.auto.status();
  }

  @Post('auto/off')
  autoOff() {
    this.auto.turnOff();
    return this.auto.status();
  }

  @Post('stop')
  stop() {
    this.runner.stop();
    return { status: this.runner.state.status };
  }

  @Post('unblock')
  unblock() {
    this.runner.unblock();
    return { status: this.runner.state.status };
  }
}
