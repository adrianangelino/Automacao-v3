import { buildMessage } from './message';

describe('buildMessage', () => {
  it('vaga remota: nome, cargo e link', () => {
    const msg = buildMessage({
      name: 'Natalia Rodríguez Patiño',
      role: 'Senior Full Stack Developer',
      postUrl: 'https://lnkd.in/p/gzSnNKbp',
      kind: 'remote',
    });

    expect(msg).toBe(
      'Hi Natalia, how are you?\n\n' +
        "I'm Adrian, a Senior Backend Engineer (Node.js, NestJS, TypeScript) based in Brazil. " +
        "I saw your post about the Senior Full Stack Developer role (https://lnkd.in/p/gzSnNKbp) and I'm really interested. " +
        "I have 5+ years building backend systems and I'm used to working remotely with international teams.\n\n" +
        'Would you be open to a quick call to talk about it?',
    );
  });

  it('vaga com relocation fala em se mudar', () => {
    const msg = buildMessage({
      name: 'Ijeoma Victoria Ekeh',
      role: 'Backend Engineer',
      postUrl: 'https://lnkd.in/p/x',
      kind: 'relocation',
    });
    expect(msg.startsWith('Hi Ijeoma, how are you?')).toBe(true);
    expect(msg).toContain("and I'm open to relocating.");
  });

  it('sem cargo, fala do post de vaga', () => {
    const msg = buildMessage({
      name: 'Abdullah Metwally',
      postUrl: 'https://lnkd.in/p/gpEHpjBE',
    });
    expect(msg).toContain(
      'I saw your recent hiring post (https://lnkd.in/p/gpEHpjBE) and',
    );
  });
});
