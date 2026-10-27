import { Controller, Get, Header } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

const QR_PAGE = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Conectar WhatsApp</title>
<style>
  :root { --bg:#f2f4f3; --card:#fff; --text:#1c2421; --muted:#61706a; --accent:#1fa855; --line:#e2e7e4; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0e1412; --card:#18201d; --text:#e6ece9; --muted:#93a19b; --accent:#2cc66a; --line:#26302c; }
  }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:16px;
         background:var(--bg); color:var(--text); font:15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .card { width:100%; max-width:760px; background:var(--card); border:1px solid var(--line); border-radius:16px;
          padding:32px; display:grid; grid-template-columns:1fr auto; gap:32px; align-items:center; }
  h1 { margin:0 0 4px; font-size:22px; }
  .sub { margin:0 0 20px; color:var(--muted); }
  ol { margin:0; padding-left:20px; }
  li { margin:6px 0; }
  b { font-weight:600; }
  .qr { width:280px; height:280px; border-radius:12px; background:#fff; padding:12px;
        display:grid; place-items:center; border:1px solid var(--line); }
  .qr img { width:100%; height:100%; image-rendering:pixelated; }
  .status { margin-top:20px; display:flex; align-items:center; gap:8px; color:var(--muted); font-size:14px; }
  .dot { width:8px; height:8px; border-radius:50%; background:var(--muted); }
  .waiting .dot { animation:pulse 1.2s infinite; }
  .ok { color:var(--accent); } .ok .dot { background:var(--accent); }
  .done { text-align:center; font-size:56px; color:var(--accent); }
  .spinner { width:36px; height:36px; border:3px solid var(--line); border-top-color:var(--accent);
             border-radius:50%; animation:spin .9s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes pulse { 50% { opacity:.3; } }
  @media (max-width:640px) {
    .card { grid-template-columns:1fr; padding:24px; }
    .qr { width:100%; height:auto; aspect-ratio:1; max-width:300px; margin:0 auto; }
  }
</style>
</head>
<body>
<main class="card">
  <section>
    <h1>Conectar o WhatsApp do bot</h1>
    <p class="sub">Pra receber os avisos e mandar comandos pelo WhatsApp.</p>
    <ol>
      <li>Abra o <b>WhatsApp</b> no celular</li>
      <li>Toque em <b>⋮ Mais opções</b> (Android) ou <b>Configurações</b> (iPhone)</li>
      <li>Entre em <b>Aparelhos conectados → Conectar um aparelho</b></li>
      <li>Aponte a câmera para o código ao lado</li>
    </ol>
    <div id="status" class="status waiting"><span class="dot"></span><span id="msg">Gerando o código…</span></div>
  </section>
  <div id="qr" class="qr"><div class="spinner"></div></div>
</main>
<script>
  const qr = document.getElementById('qr');
  const status = document.getElementById('status');
  const msg = document.getElementById('msg');
  let last;
  async function tick() {
    try {
      const s = await (await fetch('qr.json', { cache: 'no-store' })).json();
      if (s.connected) {
        qr.innerHTML = '<div class="done">✓</div>';
        status.className = 'status ok';
        msg.textContent = 'Conectado. Pode fechar esta aba.';
        return;
      }
      if (s.qr && s.qr !== last) {
        last = s.qr;
        qr.innerHTML = '<img alt="QR do WhatsApp" src="' + s.qr + '">';
      }
      msg.textContent = s.qr
        ? 'Aguardando leitura. O código se renova sozinho.'
        : 'Gerando o código… (BOT_WHATSAPP=true no .env?)';
    } catch {
      msg.textContent = 'Sem resposta do bot. Ele está rodando?';
    }
    setTimeout(tick, 3000);
  }
  tick();
</script>
</body>
</html>`;

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  @Get('qr')
  @Header('Content-Type', 'text/html; charset=utf-8')
  qr() {
    return QR_PAGE;
  }

  @Get('qr.json')
  @Header('Cache-Control', 'no-store')
  qrState() {
    return {
      connected: this.whatsapp.connected,
      qr: this.whatsapp.connected ? null : (this.whatsapp.qrDataUrl ?? null),
    };
  }
}
