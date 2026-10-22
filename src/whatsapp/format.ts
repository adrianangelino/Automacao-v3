type StatusInput = {
  status: string;
  usage: { today: number; lastHour: number };
  totals: { invited: number; messaged: number };
  auto: { enabled: boolean; nextRun?: string };
  block?: { reason: string };
};

const STATUS_LABEL: Record<string, string> = {
  idle: 'parado esperando',
  running: 'rodando agora',
  stopping: 'parando',
  blocked: '🚫 BLOQUEADO',
};

export function formatStatus(s: StatusInput): string {
  const lines = [
    `Bot: ${STATUS_LABEL[s.status] ?? s.status}`,
    `Hoje: ${s.usage.today} abordagens (${s.usage.lastHour} na última hora)`,
    `Total: ${s.totals.messaged} com mensagem, ${s.totals.invited} só conexão`,
    s.auto.enabled
      ? `Automático: ligado, próxima ${s.auto.nextRun ?? '—'}`
      : 'Automático: pausado',
  ];
  if (s.block) lines.push(`Motivo do bloqueio: ${s.block.reason}`);
  return lines.join('\n');
}

export function formatRecent(
  rows: { name: string; status: string; contactedAt: string }[],
): string {
  if (!rows.length) return 'Ninguém abordado ainda.';
  return rows
    .map((r) => {
      const when = new Date(r.contactedAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      const icon = r.status === 'messaged' ? '💬' : '🤝';
      return `${icon} ${r.name} — ${when}`;
    })
    .join('\n');
}
