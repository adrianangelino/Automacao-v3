import { Module } from '@nestjs/common';
import { BrowserModule } from '../browser/browser.module';
import { BOT_CONFIG } from '../config/bot-config';
import type { BotConfig } from '../config/bot-config';
import { ContentStore } from './content-store';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { PostPublisher } from './post-publisher.service';

@Module({
  imports: [BrowserModule],
  providers: [
    {
      provide: ContentStore,
      inject: [BOT_CONFIG],
      useFactory: (config: BotConfig) => ContentStore.open(config.dbPath),
    },
    ContentService,
    PostPublisher,
  ],
  controllers: [ContentController],
  exports: [ContentService, ContentStore],
})
export class ContentModule {}
