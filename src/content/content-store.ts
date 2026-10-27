import Database from 'better-sqlite3';

export type PostStatus =
  'collecting' | 'draft' | 'scheduled' | 'published' | 'skipped' | 'failed';

export type PostRow = {
  id: number;
  status: PostStatus;
  notes: string;
  images: string[];
  text: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
};

type RawRow = Omit<PostRow, 'images'> & { images: string };

const SELECT = `SELECT id, status, notes, images, text, scheduled_for AS scheduledFor, published_at AS publishedAt FROM posts`;

export class ContentStore {
  constructor(private readonly db: Database.Database) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        status        TEXT NOT NULL,
        notes         TEXT NOT NULL DEFAULT '',
        images        TEXT NOT NULL DEFAULT '[]',
        text          TEXT,
        created_at    TEXT NOT NULL,
        scheduled_for TEXT,
        published_at  TEXT
      )
    `);
  }

  static open(path: string): ContentStore {
    return new ContentStore(new Database(path));
  }

  active(): PostRow | undefined {
    return this.one(
      `${SELECT} WHERE status IN ('collecting', 'draft') ORDER BY id DESC LIMIT 1`,
    );
  }

  list(limit = 20): PostRow[] {
    return this.many(`${SELECT} ORDER BY id DESC LIMIT ?`, limit);
  }

  latest(): PostRow | undefined {
    return this.one(
      `${SELECT} WHERE status != 'skipped' ORDER BY id DESC LIMIT 1`,
    );
  }

  get(id: number): PostRow | undefined {
    return this.one(`${SELECT} WHERE id = ?`, id);
  }

  start(now: Date): PostRow {
    const { lastInsertRowid } = this.db
      .prepare(
        "INSERT INTO posts (status, created_at) VALUES ('collecting', ?)",
      )
      .run(now.toISOString());
    return this.get(Number(lastInsertRowid))!;
  }

  appendNote(id: number, note: string): void {
    this.db
      .prepare(
        "UPDATE posts SET notes = CASE WHEN notes = '' THEN ? ELSE notes || char(10) || ? END WHERE id = ?",
      )
      .run(note, note, id);
  }

  addImage(id: number, path: string): void {
    const post = this.get(id);
    if (!post) return;
    this.db
      .prepare('UPDATE posts SET images = ? WHERE id = ?')
      .run(JSON.stringify([...post.images, path]), id);
  }

  setDraft(id: number, text: string): void {
    this.db
      .prepare("UPDATE posts SET status = 'draft', text = ? WHERE id = ?")
      .run(text, id);
  }

  schedule(id: number, when: Date): void {
    this.db
      .prepare(
        "UPDATE posts SET status = 'scheduled', scheduled_for = ? WHERE id = ?",
      )
      .run(when.toISOString(), id);
  }

  setStatus(id: number, status: PostStatus): void {
    this.db.prepare('UPDATE posts SET status = ? WHERE id = ?').run(status, id);
  }

  markPublished(id: number, when: Date): void {
    this.db
      .prepare(
        "UPDATE posts SET status = 'published', published_at = ? WHERE id = ?",
      )
      .run(when.toISOString(), id);
  }

  due(now: Date): PostRow[] {
    return this.many(
      `${SELECT} WHERE status = 'scheduled' AND scheduled_for <= ? ORDER BY scheduled_for`,
      now.toISOString(),
    );
  }

  scheduledDates(): Date[] {
    return this.many(
      `${SELECT} WHERE status IN ('scheduled', 'published')`,
    ).map((p) => new Date(p.scheduledFor ?? p.publishedAt ?? 0));
  }

  private one(sql: string, ...params: unknown[]): PostRow | undefined {
    const raw = this.db.prepare(sql).get(...params) as RawRow | undefined;
    return raw && { ...raw, images: JSON.parse(raw.images) as string[] };
  }

  private many(sql: string, ...params: unknown[]): PostRow[] {
    const rows = this.db.prepare(sql).all(...params) as RawRow[];
    return rows.map((raw) => ({
      ...raw,
      images: JSON.parse(raw.images) as string[],
    }));
  }
}
