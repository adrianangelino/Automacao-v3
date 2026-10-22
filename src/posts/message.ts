import { PostKind } from './post-classifier';

export type MessageInput = {
  name: string;
  role?: string;
  postUrl: string;
  kind?: PostKind;
  years?: number;
};

export function buildMessage(input: MessageInput): string {
  const firstName = input.name.split(' ')[0];
  const years = input.years ?? 5;
  const post = input.role
    ? `your post about the ${input.role} role (${input.postUrl})`
    : `your recent hiring post (${input.postUrl})`;
  const fit =
    input.kind === 'relocation'
      ? "and I'm open to relocating"
      : "and I'm used to working remotely with international teams";

  return (
    `Hi ${firstName}, how are you?\n\n` +
    `I'm Adrian, a Senior Backend Engineer (Node.js, NestJS, TypeScript) based in Brazil. ` +
    `I saw ${post} and I'm really interested. ` +
    `I have ${years}+ years building backend systems ${fit}.\n\n` +
    `Would you be open to a quick call to talk about it?`
  );
}
