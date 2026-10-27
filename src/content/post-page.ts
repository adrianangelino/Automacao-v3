import type { PostRow } from './content-store';

const STATUS: Record<string, string> = {
  collecting: '✍️ juntando as notas',
  draft: '📝 rascunho — aprova no zap',
  scheduled: '⏰ agendado',
  published: '✅ publicado',
  failed: '❌ falhou ao publicar',
};

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function renderPostPage(post?: PostRow): string {
  const body = !post
    ? '<p class="empty">Nenhum post ainda. Manda <b>post</b> no zap.</p>'
    : `
      <div class="status">${STATUS[post.status] ?? post.status}${
        post.scheduledFor
          ? ` — ${new Date(post.scheduledFor).toLocaleString('pt-BR')}`
          : ''
      }</div>
      <article>
        <header>
          <div class="avatar">A</div>
          <div><b>Adrian Angelino</b><br/><small>Senior Backend Engineer · Node.js · NestJS · TypeScript</small><br/><small>agora · 🌐</small></div>
        </header>
        <p class="text">${escape(post.text ?? post.notes ?? '')}</p>
        ${post.images
          .map((path) => {
            const [, , id, file] = path.split('/');
            return `<img src="/post/media/${id}/${file}"/>`;
          })
          .join('')}
        <footer>👍 Like · 💬 Comment · 🔁 Repost · ✉️ Send</footer>
      </article>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><title>Prévia do post</title>
<style>
body{margin:0;background:#f4f2ee;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#191919}
main{max-width:555px;margin:24px auto;padding:0 12px}
.status{font-size:14px;color:#555;margin-bottom:8px}
article{background:#fff;border-radius:8px;box-shadow:0 0 0 1px #e0dfdc;overflow:hidden}
header{display:flex;gap:8px;padding:12px 16px;font-size:14px;line-height:1.3}
small{color:#666}
.avatar{width:48px;height:48px;border-radius:50%;background:#0a66c2;color:#fff;display:grid;place-items:center;font-size:20px;flex:none}
.text{white-space:pre-wrap;padding:0 16px 12px;margin:0;font-size:14px;line-height:1.45}
img{width:100%;display:block;border-top:1px solid #eee}
footer{padding:10px 16px;border-top:1px solid #eee;color:#666;font-size:14px}
.empty{text-align:center;color:#666}
</style></head><body><main>${body}</main></body></html>`;
}
