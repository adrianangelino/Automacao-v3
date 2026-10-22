export type Usage = {
  today: number;
  lastHour: number;
};

export type Limits = {
  perDay: number;
  perHour: number;
};

export type LimitCheck = { ok: true } | { ok: false; reason: string };

export function canContact(usage: Usage, limits: Limits): LimitCheck {
  if (usage.today >= limits.perDay) {
    return { ok: false, reason: `limite do dia (${limits.perDay})` };
  }

  if (usage.lastHour >= limits.perHour) {
    return { ok: false, reason: `limite da hora (${limits.perHour})` };
  }

  return { ok: true };
}
