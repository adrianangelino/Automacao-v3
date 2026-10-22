import { readFile } from 'fs/promises';
import { chromium, Browser, Page } from 'playwright';
import { readCards } from './post-cards';

describe('readCards', () => {
  jest.setTimeout(30_000);

  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    const html = await readFile('data/fixtures/posts-search.html', 'utf8');
    await page.setContent(html);
  });

  afterAll(async () => {
    await browser.close();
  });

  it('acha os 9 posts da busca', async () => {
    const cards = await readCards(page);
    expect(cards).toHaveLength(9);
  });

  it('lê nome, perfil e texto da Natalia', async () => {
    const cards = await readCards(page);
    const natalia = cards.find((c) => c.name.startsWith('Natalia'));

    expect(natalia).toBeDefined();
    expect(natalia!.profileUrl).toBe('https://www.linkedin.com/in/itrecruiternataliarodriguez/');
    expect(natalia!.text).toContain('Now Hiring: Senior Full Stack Developer');
    expect(natalia!.isCompany).toBe(false);
  });

  it('marca "open to work" pelo rótulo do autor (Ahmad)', async () => {
    const cards = await readCards(page);
    const ahmad = cards.find((c) => c.name.startsWith('Ahmad'));

    expect(ahmad).toBeDefined();
    expect(ahmad!.openToWork).toBe(true);
    expect(cards.find((c) => c.name.startsWith('Natalia'))!.openToWork).toBe(false);
  });

  it('marca empresa/grupo (RemoteYeah)', async () => {
    const cards = await readCards(page);
    const remoteYeah = cards.find((c) => c.name === 'RemoteYeah');

    expect(remoteYeah).toBeDefined();
    expect(remoteYeah!.isCompany).toBe(true);
  });
});
