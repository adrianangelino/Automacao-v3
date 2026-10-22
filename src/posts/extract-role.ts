const ROLE =
  /(?:hiring|looking for|vaga(?: de| para)?|position|role)\s*[:!\-–—]?\s*(?:an?\s+)?((?:senior|sr\.?|staff|lead|principal|mid[- ]level)?\s*[a-z/ .+#-]{0,40}?(?:engineer|developer|desenvolvedor|engenheiro)[a-z ]{0,20}?)(?=[^\p{L}\s/+#.-]|[,.]|\s{2}|\s-\s|\s(?:to|with|for|in|at|who|that)\s|$)/iu;

const LEADING_NOISE = /^(?:(?:fully|100%)\s+)?(?:remote|hybrid|on-?site)\s+/i;
const TRAILING_NOISE =
  /\s+(?:worldwide|globally|remote|remotely|latam|anywhere)$/i;

const titleCase = (text: string) =>
  text
    .toLowerCase()
    .replace(
      /(^|[\s/-])(\p{L})/gu,
      (_, sep: string, c: string) => sep + c.toUpperCase(),
    );

export function extractRole(text: string): string | undefined {
  const flat = text.replace(/\s+/g, ' ');
  const match = flat.match(ROLE);
  let role = match?.[1]
    ?.replace(/\s+(in|at|for|to|with|em|na|no|para)\s+.*$/i, '')
    .trim();
  if (!role) return undefined;

  role = role.replace(LEADING_NOISE, '');
  while (TRAILING_NOISE.test(role)) role = role.replace(TRAILING_NOISE, '');
  role = role.replace(/\b(developer|engineer)s\b/i, '$1').trim();
  if (role.length < 6) return undefined;

  const sameCase = role === role.toUpperCase() || role === role.toLowerCase();
  return sameCase ? titleCase(role) : role;
}
