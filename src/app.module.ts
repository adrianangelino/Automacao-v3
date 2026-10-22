import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ApiTokenGuard } from './auth/api-token.guard';
import { BrowserModule } from './browser/browser.module';
import { BotConfigModule } from './config/bot-config.module';
import { OutreachModule } from './outreach/outreach.module';
import { PostsModule } from './posts/posts.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    BotConfigModule,
    BrowserModule,
    PostsModule,
    OutreachModule,
    WhatsAppModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ApiTokenGuard }],
})
export class AppModule {}
