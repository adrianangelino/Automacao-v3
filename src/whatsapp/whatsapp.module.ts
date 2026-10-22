import { Module } from '@nestjs/common';
import { OutreachModule } from '../outreach/outreach.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [OutreachModule],
  providers: [WhatsAppService],
  controllers: [WhatsAppController],
})
export class WhatsAppModule {}
