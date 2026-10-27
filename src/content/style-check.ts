const PHRASES: [RegExp, string][] = [
  [
    /excited to (share|announce)|thrilled to|(happy|proud) to (share|announce)/i,
    'abertura clichê ("excited to share")',
  ],
  [
    /in today'?s (fast-paced|digital|ever-changing)/i,
    'clichê "in today\'s..."',
  ],
  [
    /game[- ]changer|unlock(ing)? the (power|potential)|leverag(e|ing)|\bdelve\b|tapestry|\belevate\b|seamless(ly)?/i,
    'palavra típica de IA',
  ],
  [
    /(key takeaways?|here'?s what i learned|let that sink in|agree\?|thoughts\?)\s*$/im,
    'fechamento de coach',
  ],
];

const EMOJI = /\p{Extended_Pictographic}/gu;

export function checkStyle(text: string): string[] {
  const issues = PHRASES.filter(([re]) => re.test(text)).map(
    ([, issue]) => issue,
  );

  if ((text.match(/—/g) ?? []).length > 1) issues.push('travessão (—) demais');
  if ((text.match(/#\w+/g) ?? []).length > 3)
    issues.push('hashtag demais (máx. 3)');
  if ((text.match(EMOJI) ?? []).length > 2)
    issues.push('emoji demais (máx. 2)');

  const emojiLines = text
    .split('\n')
    .filter((l) => /^\s*\p{Extended_Pictographic}/u.test(l));
  if (emojiLines.length >= 2)
    issues.push('lista com emoji no começo das linhas');

  return issues;
}
