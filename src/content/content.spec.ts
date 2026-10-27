import Database from 'better-sqlite3';
import { ContentStore } from './content-store';
import { nextPostSlot, nextPromptAt } from './schedule';

describe('ContentStore', () => {
  let store: ContentStore;
  const now = new Date('2026-10-22T10:00:00');

  beforeEach(() => {
    store = new ContentStore(new Database(':memory:'));
  });

  it('junta as notas e os prints do post em andamento', () => {
    const post = store.start(now);
    store.appendNote(post.id, 'Reescrevi o bot em Nest.');
    store.appendNote(post.id, 'O LinkedIn pausou minha busca.');
    store.addImage(post.id, 'data/media/1/a.jpg');

    expect(store.active()).toMatchObject({
      status: 'collecting',
      notes: 'Reescrevi o bot em Nest.\nO LinkedIn pausou minha busca.',
      images: ['data/media/1/a.jpg'],
    });
  });

  it('rascunho → agendado → publicado', () => {
    const post = store.start(now);
    store.setDraft(post.id, 'I rewrote my bot.');
    expect(store.active()?.status).toBe('draft');

    store.schedule(post.id, new Date('2026-10-27T10:00:00'));
    expect(store.active()).toBeUndefined();
    expect(store.due(new Date('2026-10-27T09:00:00'))).toEqual([]);
    expect(store.due(new Date('2026-10-27T10:05:00')).map((p) => p.id)).toEqual(
      [post.id],
    );

    store.markPublished(post.id, new Date('2026-10-27T10:05:00'));
    expect(store.due(new Date('2026-10-28T00:00:00'))).toEqual([]);
  });
});

describe('agenda', () => {
  it('publica ter/qua/qui entre 9:30 e 11h, no mínimo 30 min depois', () => {
    const slot = nextPostSlot(new Date('2026-10-22T10:30:00'), [], () => 0);
    expect(slot.toString()).toBe(new Date('2026-10-27T09:30:00').toString());
  });

  it('não repete dia já ocupado', () => {
    const slot = nextPostSlot(
      new Date('2026-10-26T12:00:00'),
      [new Date('2026-10-27T10:00:00')],
      () => 0,
    );
    expect(slot.toString()).toBe(new Date('2026-10-28T09:30:00').toString());
  });

  it('pergunta seg e qui às 10h', () => {
    expect(nextPromptAt(new Date('2026-10-22T09:00:00')).toString()).toBe(
      new Date('2026-10-22T10:00:00').toString(),
    );
    expect(nextPromptAt(new Date('2026-10-22T11:00:00')).toString()).toBe(
      new Date('2026-10-26T10:00:00').toString(),
    );
  });
});
