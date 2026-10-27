import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { OutreachModule } from '../outreach/outreach.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [OutreachModule, ContentModule],
  providers: [WhatsAppService],
  controllers: [WhatsAppController],
})
export class WhatsAppModule {}
