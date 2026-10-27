export type Command =
  | { type: 'status' }
  | { type: 'recent' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }
  | { type: 'run'; max: number; live: boolean }
  | { type: 'help' }
  | { type: 'unknown' };

const normalize = (text: string) =>
  text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function parseCommand(text: string): Command {
  const t = normalize(text);
  if (/^(status|como (ta|esta|estamos)|e ai)\b/.test(t))
    return { type: 'status' };
  if (/^(recentes?|ultimos?|quem)\b/.test(t)) return { type: 'recent' };
  if (/^(pausar?|pausa)\b/.test(t)) return { type: 'pause' };
  if (/^(ligar?|liga|retomar?|voltar?)\b/.test(t)) return { type: 'resume' };
  if (/^(parar?|para|stop)\b/.test(t)) return { type: 'stop' };
  if (/^(simular?|testar?|teste)\b/.test(t))
    return { type: 'run', max: 5, live: false };

  const run = t.match(/^rodar?(?:\s+(\d{1,2}))?\b/);
  if (run) return { type: 'run', max: run[1] ? Number(run[1]) : 5, live: true };

  if (/^(ajuda|help|\?|comandos)$/.test(t)) return { type: 'help' };
  return { type: 'unknown' };
}

export const HELP = [
  'Comandos:',
  '• status — como tá o bot',
  '• recentes — últimas abordagens',
  '• rodar 5 — rodada valendo (até 5)',
  '• simular — rodada sem mandar nada',
  '• parar — para a rodada atual',
  '• pausar / ligar — automático',
  '• post — montar um post agora',
  '• ver — prévia do post',
].join('\n');
