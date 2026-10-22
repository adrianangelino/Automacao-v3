import { canContact } from './rate-limit';

const limits = { perDay: 20, perHour: 6 };

describe('canContact', () => {
  it('libera quando está abaixo dos dois limites', () => {
    expect(canContact({ today: 5, lastHour: 2 }, limits)).toEqual({ ok: true });
  });

  it('bloqueia quando bateu o limite do dia', () => {
    expect(canContact({ today: 20, lastHour: 0 }, limits)).toEqual({
      ok: false,
      reason: 'limite do dia (20)',
    });
  });

  it('bloqueia quando bateu o limite da hora', () => {
    expect(canContact({ today: 10, lastHour: 6 }, limits)).toEqual({
      ok: false,
      reason: 'limite da hora (6)',
    });
  });

  it('o limite do dia tem prioridade sobre o da hora', () => {
    expect(canContact({ today: 25, lastHour: 9 }, limits)).toEqual({
      ok: false,
      reason: 'limite do dia (20)',
    });
  });
});
