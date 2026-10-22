import { PostCard } from '../posts/post-cards';
import { screenCard } from './screen-card';

const natalia: PostCard = {
  name: 'Natalia Rodríguez Patiño',
  profileUrl: 'https://www.linkedin.com/in/itrecruiternataliarodriguez/',
  text: '🚀 Now Hiring: Senior Full Stack Developer (Node.js) | Remote | LATAM',
  isCompany: false,
  openToWork: false,
};

describe('screenCard', () => {
  it('aceita vaga boa de pessoa ainda não abordada', () => {
    expect(screenCard(natalia, false)).toEqual({ ok: true, kind: 'remote' });
  });

  it('pula quem já foi abordado', () => {
    expect(screenCard(natalia, true)).toEqual({
      ok: false,
      reason: 'já abordado',
    });
  });

  it('pula empresa/grupo', () => {
    expect(screenCard({ ...natalia, isCompany: true }, false)).toEqual({
      ok: false,
      reason: 'empresa/grupo',
    });
  });

  it('pula open to work pelo rótulo do autor', () => {
    expect(screenCard({ ...natalia, openToWork: true }, false)).toEqual({
      ok: false,
      reason: 'open to work',
    });
  });

  it('pula conta de marca com perfil de pessoa (Remote Kraft)', () => {
    expect(screenCard({ ...natalia, name: 'Remote Kraft' }, false)).toEqual({
      ok: false,
      reason: 'conta de marca/agência',
    });
  });

  it('pula card sem perfil', () => {
    expect(screenCard({ ...natalia, profileUrl: '' }, false)).toEqual({
      ok: false,
      reason: 'sem perfil',
    });
  });

  it('repassa o motivo do classificador', () => {
    const text = 'Hiring: Node.js developer, Remote - India';
    expect(screenCard({ ...natalia, text }, false)).toEqual({
      ok: false,
      reason: 'remoto só pra outro país',
    });
  });
});
