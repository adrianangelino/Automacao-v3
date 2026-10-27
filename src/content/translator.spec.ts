import { translatePost } from './translator';

const okResponse = (content: string) =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ choices: [{ message: { content } }] }),
  }) as unknown as Response;

describe('translatePost', () => {
  it('manda as notas pro Groq e devolve o texto', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(okResponse('  This week I rewrote my bot.  '));

    const text = await translatePost(
      'Essa semana reescrevi meu bot.',
      'gsk_test',
      fetchFn,
    );

    expect(text).toBe('This week I rewrote my bot.');
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('api.groq.com');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer gsk_test',
    );
    expect(init.body as string).toContain('Essa semana reescrevi meu bot.');
  });

  it('sem chave, avisa', async () => {
    await expect(translatePost('oi', '')).rejects.toThrow('GROQ_API_KEY');
  });

  it('erro da API vira mensagem clara', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(translatePost('oi', 'k', fetchFn)).rejects.toThrow('429');
  });
});
