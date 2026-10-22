import { detectBlock } from './block-detector';

describe('detectBlock', () => {
  it('detecta busca pausada (a tela de 21/10)', () => {
    const text =
      'Our systems have detected unusual search traffic coming from your account';
    expect(detectBlock('https://www.linkedin.com/search/results/content/', text)).toEqual({
      blocked: true,
      reason: 'busca pausada',
    });
  });

  it('detecta mesmo com maiúsculas diferentes', () => {
    expect(detectBlock('https://www.linkedin.com/feed/', 'UNUSUAL SEARCH TRAFFIC').blocked).toBe(true);
  });

  it('detecta checkpoint de segurança pela URL', () => {
    expect(detectBlock('https://www.linkedin.com/checkpoint/lg/floe-profile', '')).toEqual({
      blocked: true,
      reason: 'checkpoint',
    });
  });

  it('detecta sessão caída (/login)', () => {
    expect(detectBlock('https://www.linkedin.com/login/?session_redirect=feed', '')).toEqual({
      blocked: true,
      reason: 'sessão caiu',
    });
  });

  it('detecta sessão caída (/uas/login)', () => {
    expect(detectBlock('https://www.linkedin.com/uas/login?skipRedirect=true', '').blocked).toBe(true);
  });

  it('detecta limite semanal de convites', () => {
    const text = "You've reached the weekly invitation limit";
    expect(detectBlock('https://www.linkedin.com/in/fulano/', text)).toEqual({
      blocked: true,
      reason: 'limite semanal de convites',
    });
  });

  it('libera página normal', () => {
    expect(detectBlock('https://www.linkedin.com/feed/', 'Start a post')).toEqual({ blocked: false });
  });
});
