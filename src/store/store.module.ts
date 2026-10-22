import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { BOT_CONFIG } from '../config/bot-config';
import type { BotConfig } from '../config/bot-config';
import { OutreachStore } from './outreach-store';

@Module({
  providers: [
    {
      provide: OutreachStore,
      inject: [BOT_CONFIG],
      useFactory: (config: BotConfig) => {
        mkdirSync(dirname(config.dbPath), { recursive: true });
        return new OutreachStore(config.dbPath);
      },
    },
  ],
  exports: [OutreachStore],
})
export class StoreModule implements OnModuleDestroy {
  constructor(@Inject(OutreachStore) private readonly store: OutreachStore) {}

  onModuleDestroy() {
    this.store.close();
  }
}
