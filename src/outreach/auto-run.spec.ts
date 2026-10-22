import { AutoRunConfig } from '../config/bot-config';
import { isWithinHours, nextRunAt } from './auto-run';

const config: AutoRunConfig = {
  enabled: true,
  everyMinutes: 90,
  startHour: 9,
  endHour: 19,
  maxPerRun: 4,
  live: true,
};

describe('auto-run', () => {
  it('sabe se está no horário comercial', () => {
    expect(isWithinHours(new Date('2026-10-22T10:00:00'), config)).toBe(true);
    expect(isWithinHours(new Date('2026-10-22T19:00:00'), config)).toBe(false);
    expect(isWithinHours(new Date('2026-10-22T08:59:00'), config)).toBe(false);
  });

  it('próxima rodada em ~90 min (com variação de ±25%)', () => {
    const now = new Date('2026-10-22T10:00:00');
    expect(nextRunAt(now, config, () => 0).toISOString()).toBe(
      new Date('2026-10-22T11:07:30').toISOString(),
    );
    expect(nextRunAt(now, config, () => 1).toISOString()).toBe(
      new Date('2026-10-22T11:52:30').toISOString(),
    );
  });

  it('passou do horário: pula pro dia seguinte às 9h', () => {
    const next = nextRunAt(new Date('2026-10-22T18:30:00'), config, () => 0);
    expect(next.toISOString()).toBe(
      new Date('2026-10-23T09:00:00').toISOString(),
    );
  });

  it('antes do horário: espera até as 9h do mesmo dia', () => {
    const next = nextRunAt(new Date('2026-10-22T06:00:00'), config, () => 0);
    expect(next.toISOString()).toBe(
      new Date('2026-10-22T09:00:00').toISOString(),
    );
  });
});
