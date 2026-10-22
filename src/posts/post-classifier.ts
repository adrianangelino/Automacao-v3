const OPEN_TO_WORK =
  /#?open ?to ?work|#opentowork|i am looking for|i'm looking for|starting my next chapter/i;
const SEEKER =
  /\b(i'?m|i am|she'?s|he'?s|she is|he is) (currently )?(looking for|seeking|exploring|open to)\b|if your team is hiring|i'?d love an intro|mentoring|open to (new )?(roles|opportunities|relocation)|available for (hire|work)/i;
const BENCH =
  /bench sales|\bc2c\b|corp to corp|hotlist|h1b transfer|\bopt\b|\bcpt\b/i;
const HIRING =
  /(#?\bhiring\b|we'?re hiring|now hiring|is hiring|join (our|my) team|job opportunit|apply now|send your (cv|resume)|contratando|\bvaga\b)/i;
const JS_STACK =
  /\b(node(\.?js)?|nest(\.?js)?|typescript|javascript|express(\.?js)?)\b/i;
const LOCAL_ONLY =
  /us citizens?|green card|\bw2\b|authorized to work in|no (visa )?sponsorship|without (visa )?sponsorship|onsite only|security clearance/i;
const NO_RELOCATION =
  /no relocation|relocation (is )?not (offered|provided|available)|not offering relocation|without relocation/i;
const RELOCATION =
  /\b(relocation|relocate|visa sponsorship|sponsorship|lmia|work permit)\b/i;
const REMOTE = /\b(remote|remoto|work from anywhere)\b/i;
const LATAM = /\b(latam|latin america|south america|brazil|brasil)\b/i;
const REMOTE_ANYWHERE =
  /\b(anywhere|worldwide|fully remote|100% remote|remote[- ]first|americas)\b/i;
const REMOTE_RESTRICTED =
  /remote\s*[-–(:|,]?\s*(in\s+)?(the\s+)?(us|usa|u\.s\.|united states|uk|united kingdom|india|europe|eu|emea|apac|canada|germany|spain|portugal|poland|philippines|pakistan)\b|\b(us|usa|uk|eu|india|canada)[- ]only\b|\b(us|uk|eu|india)[- ]based\b|must (be|reside|live) (located |based )?in|based in the (us|usa|uk)|within the (us|usa|uk|eu)/i;

export type PostKind = 'relocation' | 'remote';

export type Classification =
  { ok: true; kind: PostKind } | { ok: false; reason: string };

export function classifyPost(text: string): Classification {
  if (OPEN_TO_WORK.test(text)) {
    return { ok: false, reason: 'open to work' };
  }

  if (SEEKER.test(text)) {
    return { ok: false, reason: 'procura emprego / indica candidato' };
  }

  if (BENCH.test(text)) {
    return { ok: false, reason: 'bench sales / C2C' };
  }

  if (!HIRING.test(text)) {
    return { ok: false, reason: 'não é o post de vaga' };
  }

  if (!JS_STACK.test(text)) {
    return { ok: false, reason: 'fora da stack (JS/TS/Node/Nest)' };
  }

  if (LOCAL_ONLY.test(text)) {
    return { ok: false, reason: 'só local (cidadão/W2/sem sponsorship)' };
  }

  if (RELOCATION.test(text) && !NO_RELOCATION.test(text)) {
    return { ok: true, kind: 'relocation' };
  }

  if (REMOTE.test(text) && LATAM.test(text)) {
    return { ok: true, kind: 'remote' };
  }

  if (REMOTE.test(text) && REMOTE_RESTRICTED.test(text)) {
    return { ok: false, reason: 'remoto só pra outro país' };
  }

  if (REMOTE.test(text) && REMOTE_ANYWHERE.test(text)) {
    return { ok: true, kind: 'remote' };
  }

  return { ok: false, reason: 'sem relocation nem remoto LATAM' };
}
