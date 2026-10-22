import { BrowserContext, Locator, Page } from 'playwright';

declare global {
  interface Window {
    __botCopied?: string;
  }
}

export async function installClipboardHook(
  context: BrowserContext,
): Promise<void> {
  await context
    .grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: 'https://www.linkedin.com',
    })
    .catch(() => null);
  await context.addInitScript(() => {
    window.__botCopied = '';
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (clipboard?.writeText) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const original: (text: string) => Promise<void> =
        clipboard.writeText.bind(clipboard);
      clipboard.writeText = (text: string) => {
        window.__botCopied = String(text);
        return original(text);
      };
    }
  });
}

export async function copyPostLink(page: Page, card: Locator): Promise<string> {
  try {
    const menu = card
      .locator('button[aria-label^="Open control menu for post by"]')
      .first();
    if ((await menu.count()) === 0) return '';

    await menu.scrollIntoViewIfNeeded().catch(() => null);
    await page.evaluate(() => (window.__botCopied = '')).catch(() => null);
    await menu.click({ timeout: 6000 });

    const item = page
      .locator('[role="menuitem"]')
      .filter({ hasText: /copy link to post|copiar link/i })
      .first();
    const opened = await item
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!opened) {
      await page.keyboard.press('Escape').catch(() => null);
      return '';
    }

    await item.click({ timeout: 6000 });
    await page
      .waitForFunction(() => !!window.__botCopied, null, { timeout: 6000 })
      .catch(() => null);
    const url = await page
      .evaluate(() => window.__botCopied ?? '')
      .catch(() => '');
    return /linkedin\.com\/(posts|feed\/update)\/|lnkd\.in\//i.test(url)
      ? url.trim().split('?')[0]
      : '';
  } catch {
    await page.keyboard.press('Escape').catch(() => null);
    return '';
  }
}
