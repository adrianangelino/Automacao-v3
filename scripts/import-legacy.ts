import { readFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { loadBotConfig } from '../src/config/bot-config';
import { mapLegacyEntries } from '../src/store/legacy-import';
import { OutreachStore } from '../src/store/outreach-store';

const legacyPath =
  process.argv[2] ?? `${process.env.HOME}/automacao-v2/outreach.json`;
const config = loadBotConfig();

const legacy = JSON.parse(readFileSync(legacyPath, 'utf8')) as Parameters<
  typeof mapLegacyEntries
>[0];
const rows = mapLegacyEntries(legacy);

mkdirSync(dirname(config.dbPath), { recursive: true });
const store = new OutreachStore(config.dbPath);
const inserted = store.importMany(rows);

console.log(
  `📥 ${legacyPath}: ${rows.length} entradas, ${inserted} novas no banco (${config.dbPath})`,
);
console.log('   totais:', store.totals());
store.close();
