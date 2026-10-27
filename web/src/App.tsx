import { useCallback, useEffect, useState } from 'react';
import { api, getToken, mediaUrl, setToken, Unauthorized } from './api';
import type { Contact, Post, RunSummary, Status } from './api';

const POST_LABEL: Record<Post['status'], string> = {
  collecting: 'Juntando notas',
  draft: 'Esperando aprovação',
  scheduled: 'Agendado',
  published: 'Publicado',
  skipped: 'Descartado',
  failed: 'Não publicou',
};

const time = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

const dayTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

const FRIENDLY: [RegExp, string][] = [
  [/🤝 convite: invited\?? \| 💬 mensagem: sent\??/, 'conexão e mensagem enviadas'],
  [/🤝 convite: invited\?? \| 💬 mensagem: no-credits/, 'conexão enviada, mensagem vai quando aceitar'],
  [/🤝 convite: (\S+) \| 💬 mensagem: (\S+)/, 'conexão: $1, mensagem: $2'],
  [/💬 mensagem: sent\??/, 'mensagem enviada'],
  [/💬 mensagem: not-connected/, 'ainda não aceitou a conexão'],
  [/💬 mensagem pendente: /, 'conferindo se aceitou: '],
  [/▶️ rodada começou \(DRY-RUN[^)]*\)/, 'simulação começou'],
  [/▶️ rodada começou/, 'rodada começou'],
  [/✅ rodada fim: /, 'rodada terminou: '],
  [/^▶️ /, 'abordando '],
  [/^\s*(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, ''],
];

const friendly = (text: string) =>
  FRIENDLY.reduce((t, [re, to]) => t.replace(re, to), text.trim());

const nextRunTime = (nextRun?: string) => nextRun?.split(', ')[1]?.slice(0, 5);

function headline(status: Status): { text: string; tone: 'live' | 'calm' | 'alert' } {
  if (status.status === 'blocked') {
    return { text: `LinkedIn travou: ${status.block?.reason ?? 'motivo desconhecido'}`, tone: 'alert' };
  }
  if (status.status === 'running') {
    const seen = status.current?.seen ?? 0;
    return { text: seen ? `Caçando vagas — ${seen} posts lidos até agora` : 'Caçando vagas agora', tone: 'live' };
  }
  if (status.status === 'stopping') return { text: 'Terminando o post atual e parando', tone: 'live' };
  if (status.auto.enabled && status.auto.nextRun) {
    return { text: `Próxima caçada às ${nextRunTime(status.auto.nextRun)}`, tone: 'calm' };
  }
  return { text: 'Parado. Roda quando tu mandar.', tone: 'calm' };
}

function TokenScreen({ onSave }: { onSave: () => void }) {
  const [value, setValue] = useState('');
  return (
    <main className="gate">
      <h1>Radar de vagas</h1>
      <p>Pra abrir fora de casa, cola o token da API (o BOT_API_TOKEN do .env).</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setToken(value.trim());
          onSave();
        }}
      >
        <input type="password" aria-label="Token" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        <button className="solid">Entrar</button>
      </form>
    </main>
  );
}

function Funnel({ run }: { run?: RunSummary }) {
  const steps = [
    { label: 'posts lidos', value: run?.seen ?? 0 },
    { label: 'na mira', value: run?.candidates ?? 0 },
    { label: 'conexões', value: (run?.invited ?? 0) + (run?.messaged ?? 0) },
    { label: 'mensagens', value: (run?.messaged ?? 0) + (run?.followUps ?? 0) },
  ];
  const top = Math.max(steps[0].value, 1);
  return (
    <section className="funnel" aria-label="Funil da rodada">
      <ol>
        {steps.map((step) => (
          <li key={step.label}>
            <span className="funnel-value">{step.value}</span>
            <span className="funnel-label">{step.label}</span>
            <span className="funnel-bar" style={{ width: `${Math.max((step.value / top) * 100, step.value ? 6 : 0)}%` }} />
          </li>
        ))}
      </ol>
      <p className="funnel-note">
        {run
          ? `${run.dryRun ? 'Simulação. ' : ''}Buscou por ${run.terms.map((t) => `“${t}”`).join(', ') || '…'}${
              run.stopReason ? `. ${run.stopReason[0].toUpperCase()}${run.stopReason.slice(1)}.` : ''
            }`
          : 'Nenhuma rodada ainda.'}
      </p>
    </section>
  );
}

function PostPreview({ post, act }: { post: Post; act: (fn: () => Promise<unknown>) => void }) {
  return (
    <article className={`post post-${post.status}`}>
      <p className="post-state">
        {POST_LABEL[post.status]}
        {post.status === 'scheduled' && post.scheduledFor ? ` pra ${dayTime(post.scheduledFor)}` : ''}
        {post.status === 'published' && post.publishedAt ? ` em ${dayTime(post.publishedAt)}` : ''}
      </p>
      <p className="post-text">{post.text ?? post.notes}</p>
      {post.images.map((path) => (
        <img key={path} src={mediaUrl(path)} alt="Print do post" />
      ))}
      {post.status === 'draft' && (
        <div className="post-actions">
          <button className="solid" onClick={() => act(() => api.approve(post.id))}>Aprovar e agendar</button>
          <button onClick={() => act(() => api.publishNow(post.id))}>Publicar agora</button>
          <button className="quiet" onClick={() => act(() => api.skip(post.id))}>Descartar</button>
        </div>
      )}
      {post.status === 'scheduled' && (
        <div className="post-actions">
          <button onClick={() => act(() => api.publishNow(post.id))}>Publicar agora</button>
          <button className="quiet" onClick={() => act(() => api.skip(post.id))}>Cancelar</button>
        </div>
      )}
    </article>
  );
}

export default function App() {
  const [status, setStatus] = useState<Status>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [needsToken, setNeedsToken] = useState(false);
  const [error, setError] = useState('');
  const [max, setMax] = useState(5);
  const [loadedAt, setLoadedAt] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, c, p] = await Promise.all([api.status(), api.recent(), api.posts()]);
      setStatus(s);
      setContacts(c);
      setPosts(p);
      setError('');
      setNeedsToken(false);
      setLoadedAt(new Date().toISOString());
    } catch (e) {
      if (e instanceof Unauthorized) setNeedsToken(true);
      else setError('O bot não respondeu. Confere se ele tá ligado.');
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 5000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const act = (fn: () => Promise<unknown>) => {
    void fn().then(load, (e: Error) => setError(e.message));
  };

  if (needsToken) return <TokenScreen onSave={() => void load()} />;
  if (!status) return <main className="gate"><p>{error || 'Ligando o radar…'}</p></main>;

  const head = headline(status);
  const busy = status.status !== 'idle';
  const run = status.current ?? status.lastRun;
  const visiblePosts = posts.filter((p) => p.status !== 'skipped').slice(0, 3);
  const log = [...status.log].reverse().map((line) => {
    const [clock, ...rest] = line.split(' ');
    return { clock: clock.slice(0, 5), text: friendly(rest.join(' ')) };
  });

  return (
    <div className={`page tone-${head.tone}`}>
      <header className="top">
        <div className="brand">
          <span className="pulse" aria-hidden />
          <span>Radar de vagas</span>
          {getToken() && (
            <button className="quiet tiny" onClick={() => { setToken(''); setNeedsToken(true); }}>Sair</button>
          )}
        </div>
        <h1>{head.text}</h1>
        <p className="today">
          <b>{status.usage.today}</b> abordagens hoje, <b>{status.usage.lastHour}</b> na última hora.{' '}
          {status.totals.messaged} pessoas já receberam mensagem
          {status.totals.invited > 0 &&
            ` e ${status.totals.invited} ${status.totals.invited === 1 ? 'ainda vai receber quando aceitar' : 'ainda vão receber quando aceitarem'}`}
          .
        </p>

        <div className="controls">
          <label className="count">
            <span>Abordar até</span>
            <input type="number" min={1} max={50} value={max} onChange={(e) => setMax(Number(e.target.value) || 1)} />
          </label>
          <button className="solid" onClick={() => act(() => api.run(max, true))} disabled={busy}>Rodar agora</button>
          <button onClick={() => act(() => api.run(max, false))} disabled={busy}>Simular</button>
          {status.status === 'running' && <button className="quiet" onClick={() => act(api.stop)}>Parar</button>}
          <button className="switch" role="switch" aria-checked={status.auto.enabled} onClick={() => act(status.auto.enabled ? api.autoOff : api.autoOn)}>
            <span className="knob" aria-hidden />
            Automático a cada ~{status.auto.everyMinutes} min
          </button>
        </div>

        {error && <p className="alert">{error}</p>}
      </header>

      <Funnel run={run} />

      <div className="split">
        <section className="activity">
          <h2>O que o bot fez</h2>
          {log.length === 0 ? (
            <p className="empty">Nada por enquanto. Assim que uma rodada começar, cada passo aparece aqui.</p>
          ) : (
            <ol className="timeline">
              {log.slice(0, 40).map((entry, i) => (
                <li key={`${entry.clock}-${i}`}>
                  <time>{entry.clock}</time>
                  <span>{entry.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="posts">
          <h2>Teus posts</h2>
          {visiblePosts.length === 0 ? (
            <p className="empty">Nenhum post na fila. Manda “post” no zap e conta o que tu fez essa semana.</p>
          ) : (
            visiblePosts.map((post) => <PostPreview key={post.id} post={post} act={act} />)
          )}
        </section>
      </div>

      <section className="people">
        <h2>Quem foi abordado</h2>
        <table>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.profileUrl}>
                <td>
                  <a href={c.profileUrl} target="_blank" rel="noreferrer">{c.name}</a>
                </td>
                <td className={`state state-${c.status}`}>{c.status === 'messaged' ? 'mensagem enviada' : 'esperando aceitar'}</td>
                <td className="kind">{c.kind === 'relocation' ? 'relocation' : 'remoto'}</td>
                <td>
                  <a className="quiet-link" href={c.postUrl} target="_blank" rel="noreferrer">ver post</a>
                </td>
                <td className="when">{dayTime(c.contactedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer>Atualiza sozinho a cada 5 segundos. Última leitura às {time(loadedAt)}.</footer>
    </div>
  );
}
