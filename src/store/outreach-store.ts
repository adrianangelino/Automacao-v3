import Database from 'better-sqlite3';

export type OutreachEntry = {
  profileUrl: string;
  name: string;
  kind: string;
  postUrl: string;
};

export type OutreachStatus = 'invited' | 'messaged' | 'skipped';

export type Usage = { today: number; lastHour: number };

export type OutreachRow = OutreachEntry & {
  status: OutreachStatus;
  contactedAt: string;
};

export class OutreachStore {
  private db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS outreach (
        profile_url  TEXT PRIMARY KEY,
        name         TEXT,
        kind         TEXT,
        post_url     TEXT,
        status       TEXT NOT NULL DEFAULT 'messaged',
        contacted_at TEXT
      )
    `);
    const columns = this.db.prepare('PRAGMA table_info(outreach)').all() as {
      name: string;
    }[];
    if (!columns.some((c) => c.name === 'messaged_at')) {
      this.db.exec('ALTER TABLE outreach ADD COLUMN messaged_at TEXT');
    }
    if (!columns.some((c) => c.name === 'checked_at')) {
      this.db.exec('ALTER TABLE outreach ADD COLUMN checked_at TEXT');
    }
  }

  wasContacted(profileUrl: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM outreach WHERE profile_url = ?')
      .get(profileUrl);
    return row !== undefined;
  }

  record(
    entry: OutreachEntry,
    when: Date,
    status: OutreachStatus = 'messaged',
  ): void {
    this.db
      .prepare(
        'INSERT INTO outreach (profile_url, name, kind, post_url, status, contacted_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        entry.profileUrl,
        entry.name,
        entry.kind,
        entry.postUrl,
        status,
        when.toISOString(),
      );
  }

  importMany(
    rows: { entry: OutreachEntry; when: Date; status: OutreachStatus }[],
  ): number {
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO outreach (profile_url, name, kind, post_url, status, contacted_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    const insertAll = this.db.transaction((items: typeof rows) => {
      let inserted = 0;
      for (const { entry, when, status } of items) {
        inserted += insert.run(
          entry.profileUrl,
          entry.name,
          entry.kind,
          entry.postUrl,
          status,
          when.toISOString(),
        ).changes;
      }
      return inserted;
    });
    return insertAll(rows);
  }

  usage(now: Date): Usage {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    return {
      today: this.countSince(startOfToday),
      lastHour: this.countSince(oneHourAgo),
    };
  }

  pendingMessages(now: Date, limit = 3, recheckHours = 6): OutreachRow[] {
    const checkedBefore = new Date(now.getTime() - recheckHours * 3600_000);
    return this.db
      .prepare(
        `SELECT profile_url AS profileUrl, name, kind, post_url AS postUrl, status, contacted_at AS contactedAt
         FROM outreach
         WHERE status = 'invited' AND post_url != '' AND (checked_at IS NULL OR checked_at < ?)
         ORDER BY checked_at IS NOT NULL, checked_at, contacted_at
         LIMIT ?`,
      )
      .all(checkedBefore.toISOString(), limit) as OutreachRow[];
  }

  markChecked(profileUrl: string, when: Date): void {
    this.db
      .prepare('UPDATE outreach SET checked_at = ? WHERE profile_url = ?')
      .run(when.toISOString(), profileUrl);
  }

  markMessaged(profileUrl: string, when: Date): void {
    this.db
      .prepare(
        "UPDATE outreach SET status = 'messaged', messaged_at = ? WHERE profile_url = ?",
      )
      .run(when.toISOString(), profileUrl);
  }

  recent(limit = 10): OutreachRow[] {
    return this.db
      .prepare(
        `SELECT profile_url AS profileUrl, name, kind, post_url AS postUrl, status, contacted_at AS contactedAt
         FROM outreach WHERE status != 'skipped' ORDER BY contacted_at DESC LIMIT ?`,
      )
      .all(limit) as OutreachRow[];
  }

  totals(): Record<OutreachStatus, number> {
    const rows = this.db
      .prepare('SELECT status, COUNT(*) AS n FROM outreach GROUP BY status')
      .all() as {
      status: OutreachStatus;
      n: number;
    }[];
    const totals: Record<OutreachStatus, number> = {
      invited: 0,
      messaged: 0,
      skipped: 0,
    };
    for (const r of rows) totals[r.status] = r.n;
    return totals;
  }

  close(): void {
    this.db.close();
  }

  private countSince(since: Date): number {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) AS n FROM outreach WHERE status != 'skipped' AND contacted_at >= ?",
      )
      .get(since.toISOString()) as { n: number };
    return row.n;
  }
}
