import { renderPostPage } from './post-page';

describe('renderPostPage', () => {
  it('mostra texto e imagens do post', () => {
    const html = renderPostPage({
      id: 3,
      status: 'draft',
      notes: 'notas',
      images: ['data/media/3/1.jpg'],
      text: 'This week I rewrote my bot.',
      scheduledFor: null,
      publishedAt: null,
    });
    expect(html).toContain('This week I rewrote my bot.');
    expect(html).toContain('<img src="/post/media/3/1.jpg"/>');
    expect(html).toContain('rascunho');
  });

  it('não deixa injetar HTML pelo texto', () => {
    const html = renderPostPage({
      id: 1,
      status: 'draft',
      notes: '',
      images: [],
      text: '<script>alert(1)</script>',
      scheduledFor: null,
      publishedAt: null,
    });
    expect(html).not.toContain('<script>alert');
  });

  it('sem post, explica como começar', () => {
    expect(renderPostPage()).toContain('Nenhum post ainda');
  });
});
