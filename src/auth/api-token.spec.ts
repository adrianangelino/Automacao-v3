import { isAuthorized } from './api-token';

describe('isAuthorized', () => {
  it('sem token configurado, libera tudo', () => {
    expect(isAuthorized({ ip: '100.64.0.5' }, '')).toBe(true);
  });

  it('chamada da própria máquina não precisa de token', () => {
    expect(isAuthorized({ ip: '127.0.0.1' }, 'segredo')).toBe(true);
    expect(isAuthorized({ ip: '::1' }, 'segredo')).toBe(true);
  });

  it('chamada de fora precisa do token certo', () => {
    expect(isAuthorized({ ip: '100.64.0.5' }, 'segredo')).toBe(false);
    expect(
      isAuthorized(
        { ip: '100.64.0.5', authorization: 'Bearer errado' },
        'segredo',
      ),
    ).toBe(false);
    expect(
      isAuthorized(
        { ip: '100.64.0.5', authorization: 'Bearer segredo' },
        'segredo',
      ),
    ).toBe(true);
  });
});
