import { PostCard } from '../posts/post-cards';
import { classifyPost, PostKind } from '../posts/post-classifier';

const BRAND_NAME =
  /\b(remote|jobs?|hiring|careers?|recruiting|recruitment|talent|staffing|agency|solutions|technologies|global|hub|network)\b/i;

export type Screening =
  { ok: true; kind: PostKind } | { ok: false; reason: string };

export function screenCard(
  card: PostCard,
  alreadyContacted: boolean,
): Screening {
  if (card.isCompany) return { ok: false, reason: 'empresa/grupo' };
  if (!card.profileUrl) return { ok: false, reason: 'sem perfil' };
  if (card.openToWork) return { ok: false, reason: 'open to work' };
  if (BRAND_NAME.test(card.name))
    return { ok: false, reason: 'conta de marca/agência' };
  if (alreadyContacted) return { ok: false, reason: 'já abordado' };
  return classifyPost(card.text);
}
