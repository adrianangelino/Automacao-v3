import { checkStyle } from './style-check';

describe('checkStyle', () => {
  it('texto pessoal e direto passa limpo', () => {
    const text =
      'This week I rewrote my LinkedIn bot from plain JS to NestJS.\n\nThe hardest part was LinkedIn pausing my searches after two days without limits. Now it has daily caps and stops by itself when blocked.';
    expect(checkStyle(text)).toEqual([]);
  });

  it('pega clichês de IA', () => {
    const text =
      "🚀 Excited to share that I'm leveraging NestJS to unlock the power of automation!";
    expect(checkStyle(text)).toEqual(
      expect.arrayContaining([
        'abertura clichê ("excited to share")',
        'palavra típica de IA',
      ]),
    );
  });

  it('pega lista com emoji, travessão e hashtag demais', () => {
    const text =
      '✅ Faster — cleaner — better\n✅ Tested\n#node #nestjs #typescript #backend';
    expect(checkStyle(text)).toEqual(
      expect.arrayContaining([
        'travessão (—) demais',
        'hashtag demais (máx. 3)',
        'lista com emoji no começo das linhas',
      ]),
    );
  });
});
