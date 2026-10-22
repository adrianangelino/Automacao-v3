import { loadBotConfig } from './bot-config';

describe('loadBotConfig', () => {
  it('usa padrões seguros sem .env', () => {
    const config = loadBotConfig({});
    expect(config.limits).toEqual({ perDay: 20, perHour: 6 });
    expect(config.dbPath).toBe('data/bot.sqlite');
    expect(config.searchTerms.length).toBeGreaterThan(0);
  });

  it('lê limites e termos do ambiente', () => {
    const config = loadBotConfig({
      BOT_LIMIT_PER_DAY: '10',
      BOT_LIMIT_PER_HOUR: '3',
      BOT_SEARCH_TERMS: 'hiring node remote | hiring react relocation',
    });
    expect(config.limits).toEqual({ perDay: 10, perHour: 3 });
    expect(config.searchTerms).toEqual([
      'hiring node remote',
      'hiring react relocation',
    ]);
  });

  it('ignora número inválido e volta pro padrão', () => {
    expect(loadBotConfig({ BOT_LIMIT_PER_DAY: 'abc' }).limits.perDay).toBe(20);
  });
});
