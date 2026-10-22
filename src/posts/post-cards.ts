import { Locator, Page } from 'playwright';

export type PostCard = {
  name: string;
  profileUrl: string;
  text: string;
  isCompany: boolean;
  openToWork: boolean;
};

export const CARD = '[role="listitem"][componentkey^="update-card-focus"]';

export async function readCards(page: Page): Promise<PostCard[]> {
  const cards: PostCard[] = [];

  for (const card of await page.locator(CARD).all()) {
    cards.push(await readCard(card));
  }

  return cards;
}

export async function readCard(card: Locator): Promise<PostCard> {
  const menuLabel = await card
    .locator('button[aria-label^="Open control menu for post by"]')
    .first()
    .getAttribute('aria-label', { timeout: 1000 })
    .catch(() => null);

  const name = (menuLabel ?? '').replace(
    'Open control menu for post by ',
    '',
  );

  const companyCount = await card
    .locator('[aria-label^="View company:"], [aria-label^="View group:"]')
    .count();

  const openToWorkCount = await card
    .locator('[aria-label*="Open to work" i]')
    .count();

  const href = await card
    .locator('a[href*="/in/"]')
    .first()
    .getAttribute('href', { timeout: 1000 })
    .catch(() => null);

  const profileUrl = (href ?? '').split('?')[0];

  const text = await card
    .locator('[data-testid="expandable-text-box"]')
    .first()
    .innerText({ timeout: 1000 })
    .catch(() => '');

  const isCompany = companyCount > 0;
  const openToWork = openToWorkCount > 0;

  return { name, profileUrl, text, isCompany, openToWork };
}
