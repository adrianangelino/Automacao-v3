export type Status = {
  status: 'idle' | 'running' | 'stopping' | 'blocked';
  usage: { today: number; lastHour: number };
  limits: { perDay: number; perHour: number };
  totals: { invited: number; messaged: number; skipped: number };
  auto: { enabled: boolean; nextRun?: string; everyMinutes: number; hours: string; maxPerRun: number; live: boolean };
  current?: RunSummary;
  lastRun?: RunSummary;
  block?: { reason: string; at: string };
  log: string[];
};

export type RunSummary = {
  startedAt: string;
  finishedAt?: string;
  dryRun: boolean;
  terms: string[];
  seen: number;
  candidates: number;
  invited: number;
  messaged: number;
  followUps: number;
  stopReason?: string;
};

export type Contact = {
  profileUrl: string;
  name: string;
  kind: string;
  postUrl: string;
  status: 'invited' | 'messaged';
  contactedAt: string;
};

export type Post = {
  id: number;
  status: 'collecting' | 'draft' | 'scheduled' | 'published' | 'skipped' | 'failed';
  notes: string;
  images: string[];
  text: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
};

const TOKEN_KEY = 'bot-token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
};

export const setToken = (token: string) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    return;
  }
};

export class Unauthorized extends Error {}

async function request<T>(method: 'GET' | 'POST', path: string): Promise<T> {
  const token = getToken();
  const response = await fetch(path, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (response.status === 401) throw new Unauthorized();
  if (!response.ok) throw new Error(`${response.status} em ${path}`);
  return (await response.json()) as T;
}

export const api = {
  status: () => request<Status>('GET', '/status'),
  recent: () => request<Contact[]>('GET', '/recent?limit=15'),
  posts: () => request<Post[]>('GET', '/post/list'),
  run: (max: number, live: boolean) =>
    request<{ started: boolean; reason?: string }>('POST', `/run?max=${max}${live ? '&live=true' : ''}`),
  stop: () => request('POST', '/stop'),
  autoOn: () => request('POST', '/auto/on'),
  autoOff: () => request('POST', '/auto/off'),
  approve: (id: number) => request('POST', `/post/${id}/approve`),
  publishNow: (id: number) => request('POST', `/post/${id}/publish-now`),
  skip: (id: number) => request('POST', `/post/${id}/skip`),
};

export const mediaUrl = (path: string) => {
  const [, , id, file] = path.split('/');
  return `/post/media/${id}/${file}`;
};
