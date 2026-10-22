import { classifyPost } from './post-classifier';

describe('classifyPost', () => {
  it('aceita vaga remota aberta p/ LATAM (Natalia)', () => {
    const text =
      '🚀 Now Hiring: Senior Full Stack Developer (Node.js, TypeScript) | Remote | LATAM';
    expect(classifyPost(text)).toEqual({ ok: true, kind: 'remote' });
  });

  it('aceita vaga com relocation e visa sponsorship', () => {
    const text =
      "We're hiring a Senior Backend Engineer in Toronto. Relocation and visa sponsorship provided. Node.js";
    expect(classifyPost(text)).toEqual({ ok: true, kind: 'relocation' });
  });

  it('aceita 100% remoto sem restrição de país', () => {
    const text =
      'We are hiring a Senior NestJS Backend Engineer. Fully remote, work from anywhere.';
    expect(classifyPost(text)).toEqual({ ok: true, kind: 'remote' });
  });

  it('aceita remoto que cita Brasil mesmo listando outros países', () => {
    const text =
      'Hiring: TypeScript Backend Developer — Remote (US or Brazil time zones)';
    expect(classifyPost(text)).toEqual({ ok: true, kind: 'remote' });
  });

  it('descarta quem divulga candidato (Sara)', () => {
    const text =
      "I've started mentoring Shachi. She's looking for early-career roles in AI engineering. If your team is hiring junior engineers, I'd love an intro.";
    expect(classifyPost(text)).toEqual({
      ok: false,
      reason: 'procura emprego / indica candidato',
    });
  });

  it('descarta "open to work"', () => {
    expect(
      classifyPost('Open to Work | GenAI Technical Lead | Senior Engineer').ok,
    ).toBe(false);
  });

  it('descarta bench sales / hotlist', () => {
    const text =
      'ONEITCORP IT CONSULTANT HOTLIST | 28 CONSULTANTS AVAILABLE NOW! C2C';
    expect(classifyPost(text)).toEqual({
      ok: false,
      reason: 'bench sales / C2C',
    });
  });

  it('descarta vaga fora da stack (Java, Meenakshi)', () => {
    const text =
      'HIRING FOR #CANADA Java Developer Opportunities Across Canada! Remote, relocation';
    expect(classifyPost(text)).toEqual({
      ok: false,
      reason: 'fora da stack (JS/TS/Node/Nest)',
    });
  });

  it('descarta vaga só p/ cidadão americano / W2', () => {
    const text =
      'Hiring: Node.js Developer, Remote. Must be US Citizen or Green Card, W2 only';
    expect(classifyPost(text)).toEqual({
      ok: false,
      reason: 'só local (cidadão/W2/sem sponsorship)',
    });
  });

  it('descarta remota só p/ outro país', () => {
    expect(classifyPost('Hiring: Node.js developer, Remote - India')).toEqual({
      ok: false,
      reason: 'remoto só pra outro país',
    });
    expect(
      classifyPost(
        'We are hiring a TypeScript engineer, fully remote (US only)',
      ),
    ).toEqual({ ok: false, reason: 'remoto só pra outro país' });
  });

  it('descarta quando diz que não tem relocation', () => {
    const text =
      'Hiring Senior Node.js Engineer in Berlin, onsite. No relocation offered.';
    expect(classifyPost(text)).toEqual({
      ok: false,
      reason: 'sem relocation nem remoto LATAM',
    });
  });

  it('descarta vaga sem remoto nem relocation', () => {
    const text = 'We are hiring a Node.js developer for our office in London';
    expect(classifyPost(text)).toEqual({
      ok: false,
      reason: 'sem relocation nem remoto LATAM',
    });
  });

  it('descarta vaga fora de tecnologia', () => {
    expect(
      classifyPost('We are hiring a Marketing Manager, remote worldwide').ok,
    ).toBe(false);
  });

  it('descarta post que não é vaga', () => {
    expect(
      classifyPost(
        'Hello LinkedIn Network! Happy to share my new certification',
      ).ok,
    ).toBe(false);
  });
});
