import { OutreachEntry, OutreachStatus } from './outreach-store';

type LegacyEntry = {
  name?: string;
  profileUrl?: string;
  kind?: string;
  postUrl?: string;
  status?: string;
  foundAt?: string;
  invitedAt?: string;
  messagedAt?: string;
};

export type ImportRow = {
  entry: OutreachEntry;
  when: Date;
  status: OutreachStatus;
};

export function mapLegacyEntries(legacy: {
  entries?: LegacyEntry[];
}): ImportRow[] {
  const rows: ImportRow[] = [];

  for (const e of legacy.entries ?? []) {
    if (!e.profileUrl) continue;

    const status: OutreachStatus =
      e.status === 'messaged'
        ? 'messaged'
        : e.status === 'invited'
          ? 'invited'
          : 'skipped';
    const when = new Date(e.messagedAt ?? e.invitedAt ?? e.foundAt ?? 0);

    rows.push({
      entry: {
        profileUrl: e.profileUrl.split('?')[0],
        name: e.name ?? '',
        kind: e.kind ?? '',
        postUrl: e.postUrl ?? '',
      },
      when,
      status,
    });
  }

  return rows;
}
