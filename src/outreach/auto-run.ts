import { AutoRunConfig } from '../config/bot-config';

export function isWithinHours(now: Date, config: AutoRunConfig): boolean {
  const hour = now.getHours();
  return hour >= config.startHour && hour < config.endHour;
}

export function nextRunAt(
  now: Date,
  config: AutoRunConfig,
  random: () => number = Math.random,
): Date {
  const jitter = 0.75 + random() * 0.5;
  const next = new Date(now.getTime() + config.everyMinutes * jitter * 60_000);
  if (isWithinHours(next, config)) return next;

  const start = new Date(next);
  start.setHours(config.startHour, Math.floor(random() * 30), 0, 0);
  if (start <= next) start.setDate(start.getDate() + 1);
  return start;
}
