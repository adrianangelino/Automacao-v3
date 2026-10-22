import { Controller, Get, Header } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  @Get('qr')
  @Header('Content-Type', 'text/html; charset=utf-8')
  qr() {
    if (this.whatsapp.connected) return '<h2>WhatsApp já conectado ✅</h2>';
    if (!this.whatsapp.qrDataUrl) {
      return '<h2>QR ainda não gerado. Confere se BOT_WHATSAPP=true e recarrega em alguns segundos.</h2><script>setTimeout(()=>location.reload(),3000)</script>';
    }
    return `<h2>WhatsApp → Aparelhos conectados → Conectar um aparelho</h2><img src="${this.whatsapp.qrDataUrl}" width="320"/><script>setTimeout(()=>location.reload(),5000)</script>`;
  }
}
