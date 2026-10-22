import { Module } from '@nestjs/common';
import { BrowserModule } from './browser/browser.module';
import { BotConfigModule } from './config/bot-config.module';
import { OutreachModule } from './outreach/outreach.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [BotConfigModule, BrowserModule, PostsModule, OutreachModule],
})
export class AppModule {}
