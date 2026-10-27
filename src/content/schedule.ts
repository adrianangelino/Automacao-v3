const PUBLISH_DAYS = [2, 3, 4];
const PROMPT_DAYS = [1, 4];

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function nextPostSlot(
  now: Date,
  taken: Date[] = [],
  random: () => number = Math.random,
): Date {
  const minimum = new Date(now.getTime() + 30 * 60_000);
  for (let d = 0; d < 14; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    if (!PUBLISH_DAYS.includes(day.getDay())) continue;
    if (taken.some((t) => sameDay(t, day))) continue;
    const slot = new Date(day);
    slot.setHours(9, 30 + Math.floor(random() * 90), 0, 0);
    if (slot >= minimum) return slot;
  }
  throw new Error('sem horário livre nas próximas 2 semanas');
}

export function nextPromptAt(now: Date): Date {
  for (let d = 0; d < 8; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    if (!PROMPT_DAYS.includes(day.getDay())) continue;
    day.setHours(10, 0, 0, 0);
    if (day > now) return day;
  }
  throw new Error('impossível');
}
