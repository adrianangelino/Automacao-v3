import { OutreachStore } from './outreach-store';

describe('OutreachStore', () => {
  let store: OutreachStore;

  beforeEach(() => {
    store = new OutreachStore(':memory:');
  });

  const natalia = {
    profileUrl: 'https://www.linkedin.com/in/itrecruiternataliarodriguez/',
    name: 'Natalia Rodríguez Patiño',
    kind: 'remote',
    postUrl: 'https://lnkd.in/p/gzSnNKbp',
  };

  it('pessoa nova não foi abordada', () => {
    expect(store.wasContacted(natalia.profileUrl)).toBe(false);
  });

  it('depois de registrar, a pessoa conta como abordada', () => {
    store.record(natalia, new Date('2026-10-22T10:00:00'));
    expect(store.wasContacted(natalia.profileUrl)).toBe(true);
  });

  it('conta as abordagens de hoje e da última hora', () => {
    const now = new Date('2026-10-22T15:00:00');

    store.record(
      { ...natalia, profileUrl: 'https://www.linkedin.com/in/ontem/' },
      new Date('2026-10-21T23:00:00'),
    );
    store.record(
      { ...natalia, profileUrl: 'https://www.linkedin.com/in/manha/' },
      new Date('2026-10-22T09:00:00'),
    );
    store.record(
      { ...natalia, profileUrl: 'https://www.linkedin.com/in/agora1/' },
      new Date('2026-10-22T14:30:00'),
    );
    store.record(
      { ...natalia, profileUrl: 'https://www.linkedin.com/in/agora2/' },
      new Date('2026-10-22T14:50:00'),
    );

    expect(store.usage(now)).toEqual({ today: 3, lastHour: 2 });
  });

  it('quem ficou só no convite volta pra receber a mensagem', () => {
    const now = new Date('2026-10-22T12:00:00');
    store.record(natalia, new Date('2026-10-22T10:00:00'), 'invited');
    expect(store.pendingMessages(now).map((r) => r.name)).toEqual([
      natalia.name,
    ]);

    store.markMessaged(natalia.profileUrl, now);
    expect(store.pendingMessages(now)).toEqual([]);
    expect(store.totals().messaged).toBe(1);
  });

  it('não confere a mesma pessoa pendente de novo antes de 6h', () => {
    store.record(natalia, new Date('2026-10-22T10:00:00'), 'invited');
    store.markChecked(natalia.profileUrl, new Date('2026-10-22T12:00:00'));

    expect(store.pendingMessages(new Date('2026-10-22T14:00:00'))).toEqual([]);
    expect(store.pendingMessages(new Date('2026-10-22T18:30:00'))).toHaveLength(
      1,
    );
  });
});
