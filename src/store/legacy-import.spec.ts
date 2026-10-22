import { mapLegacyEntries } from './legacy-import';
import { OutreachStore } from './outreach-store';

const legacy = {
  entries: [
    {
      name: 'Natalia Rodríguez Patiño',
      profileUrl: 'https://www.linkedin.com/in/itrecruiternataliarodriguez/',
      kind: 'remote',
      postUrl: 'https://lnkd.in/p/gzSnNKbp',
      status: 'messaged',
      invitedAt: '2026-10-20T12:00:00.000Z',
      messagedAt: '2026-10-20T13:00:00.000Z',
    },
    {
      name: 'Daniel Frimpong',
      profileUrl: 'https://www.linkedin.com/in/daniel/',
      status: 'invited',
      invitedAt: '2026-10-20T11:00:00.000Z',
    },
    {
      name: 'Sara Czyzewicz',
      profileUrl: 'https://www.linkedin.com/in/saraolive/',
      status: 'skipped',
      foundAt: '2026-10-20T14:00:00.000Z',
    },
    { name: 'sem perfil' },
  ],
};

describe('mapLegacyEntries', () => {
  it('converte as entradas e ignora as sem perfil', () => {
    const rows = mapLegacyEntries(legacy);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.status)).toEqual([
      'messaged',
      'invited',
      'skipped',
    ]);
  });

  it('usa a data da mensagem quando existe', () => {
    const [natalia] = mapLegacyEntries(legacy);
    expect(natalia.when.toISOString()).toBe('2026-10-20T13:00:00.000Z');
  });

  it('importar duas vezes não duplica', () => {
    const store = new OutreachStore(':memory:');
    expect(store.importMany(mapLegacyEntries(legacy))).toBe(3);
    expect(store.importMany(mapLegacyEntries(legacy))).toBe(0);
    expect(store.wasContacted('https://www.linkedin.com/in/saraolive/')).toBe(
      true,
    );
    expect(store.totals()).toEqual({ messaged: 1, invited: 1, skipped: 1 });
  });
});
