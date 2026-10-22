import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BOT_CONFIG, loadBotConfig } from './bot-config';

@Global()
@Module({
  imports: [ConfigModule.forRoot()],
  providers: [{ provide: BOT_CONFIG, useFactory: () => loadBotConfig() }],
  exports: [BOT_CONFIG],
})
export class BotConfigModule {}
