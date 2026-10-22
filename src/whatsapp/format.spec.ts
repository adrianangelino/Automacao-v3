import { formatRecent, formatStatus } from './format';

describe('formatStatus', () => {
  it('resume o estado em poucas linhas', () => {
    const text = formatStatus({
      status: 'idle',
      usage: { today: 4, lastHour: 1 },
      totals: { invited: 2, messaged: 95 },
      auto: { enabled: true, nextRun: '22/10/2026, 15:10:00' },
    });
    expect(text).toBe(
      'Bot: parado esperando\n' +
        'Hoje: 4 abordagens (1 na última hora)\n' +
        'Total: 95 com mensagem, 2 só conexão\n' +
        'Automático: ligado, próxima 22/10/2026, 15:10:00',
    );
  });

  it('mostra o motivo quando bloqueado', () => {
    const text = formatStatus({
      status: 'blocked',
      usage: { today: 0, lastHour: 0 },
      totals: { invited: 0, messaged: 0 },
      auto: { enabled: false },
      block: { reason: 'busca pausada' },
    });
    expect(text).toContain('🚫 BLOQUEADO');
    expect(text).toContain('Motivo do bloqueio: busca pausada');
  });
});

describe('formatRecent', () => {
  it('lista com ícone por status', () => {
    const text = formatRecent([
      {
        name: 'Diego Yann',
        status: 'messaged',
        contactedAt: '2026-10-22T13:53:52.466Z',
      },
      {
        name: 'Florencia Gulino',
        status: 'invited',
        contactedAt: '2026-10-22T14:12:06.747Z',
      },
    ]);
    expect(text.split('\n')[0]).toMatch(/^💬 Diego Yann — /);
    expect(text.split('\n')[1]).toMatch(/^🤝 Florencia Gulino — /);
  });

  it('avisa quando não tem ninguém', () => {
    expect(formatRecent([])).toBe('Ninguém abordado ainda.');
  });
});
