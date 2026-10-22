import { Limits } from '../limits/rate-limit';

export type BotConfig = {
  dbPath: string;
  chromeProfileDir: string;
  limits: Limits;
  pace: number;
  termsPerRun: number;
  searchTerms: string[];
  yearsOfExperience: number;
  autoRun: AutoRunConfig;
  apiToken: string;
  whatsapp: boolean;
};

export type AutoRunConfig = {
  enabled: boolean;
  everyMinutes: number;
  startHour: number;
  endHour: number;
  maxPerRun: number;
  live: boolean;
};

const DEFAULT_SEARCH_TERMS = [
  'hiring node.js developer remote LATAM',
  'hiring nestjs developer remote',
  'hiring typescript backend engineer remote Brazil',
  'hiring node.js engineer fully remote',
  'hiring backend engineer node.js relocation',
  'hiring typescript developer visa sponsorship',
  'hiring javascript backend developer remote Latin America',
  'hiring node.js developer work from anywhere',
  'hiring nestjs backend relocation',
  'hiring senior node.js engineer remote worldwide',
];

const parseHours = (value: string | undefined): [number, number] => {
  const match = value?.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
  return match ? [Number(match[1]), Number(match[2])] : [9, 19];
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n)
    ? n
    : fallback;
};

export function loadBotConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  return {
    dbPath: env.BOT_DB_PATH || 'data/bot.sqlite',
    chromeProfileDir: env.BOT_CHROME_PROFILE || 'data/chrome-profile',
    limits: {
      perDay: toNumber(env.BOT_LIMIT_PER_DAY, 20),
      perHour: toNumber(env.BOT_LIMIT_PER_HOUR, 6),
    },
    pace: toNumber(env.BOT_PACE, 1),
    termsPerRun: toNumber(env.BOT_TERMS_PER_RUN, 2),
    searchTerms: env.BOT_SEARCH_TERMS
      ? env.BOT_SEARCH_TERMS.split('|')
          .map((t) => t.trim())
          .filter(Boolean)
      : DEFAULT_SEARCH_TERMS,
    yearsOfExperience: toNumber(env.BOT_YEARS_OF_EXPERIENCE, 5),
    apiToken: env.BOT_API_TOKEN ?? '',
    whatsapp: env.BOT_WHATSAPP === 'true',
    autoRun: {
      enabled: env.BOT_AUTO_RUN === 'true',
      everyMinutes: toNumber(env.BOT_AUTO_EVERY_MIN, 90),
      startHour: parseHours(env.BOT_AUTO_HOURS)[0],
      endHour: parseHours(env.BOT_AUTO_HOURS)[1],
      maxPerRun: toNumber(env.BOT_AUTO_MAX_PER_RUN, 4),
      live: env.BOT_AUTO_LIVE === 'true',
    },
  };
}

export const BOT_CONFIG = Symbol('BOT_CONFIG');
