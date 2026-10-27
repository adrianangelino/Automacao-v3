import { mkdirSync } from 'fs';
import { Page } from 'playwright';
import { Human } from '../common/human';

const shot = async (page: Page, name: string) => {
  mkdirSync('data/debug', { recursive: true });
  const path = `data/debug/${new Date().toISOString().replace(/[:.]/g, '-')}-${name}.png`;
  await page.screenshot({ path }).catch(() => null);
  return path;
};

export class PostComposer {
  constructor(
    private readonly page: Page,
    private readonly human: Human,
  ) {}

  async open(): Promise<boolean> {
    await this.page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'domcontentloaded',
      timeout: 40_000,
    });
    await this.page.waitForTimeout(6000);
    const start = this.page
      .locator('button, [role="button"]')
      .filter({ hasText: /^\s*Start a post\s*$/i })
      .first();
    const found = await start
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!found) return false;
    await this.human.pause(1500, 3000);
    await start.click({ timeout: 8000 });
    await this.page.waitForTimeout(3000);
    return true;
  }

  async fill(text: string, images: string[]): Promise<string | undefined> {
    const editor = this.page
      .locator(
        'div.ProseMirror[role="textbox"], [role="textbox"][contenteditable="true"]',
      )
      .filter({ visible: true })
      .first();
    const ready = await editor
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!ready) return 'editor não abriu';

    await editor.click({ timeout: 6000 });
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]) {
        await this.page.keyboard.type(lines[i], {
          delay: 25 + Math.floor(Math.random() * 45),
        });
      }
      if (i < lines.length - 1) await this.page.keyboard.press('Enter');
    }
    await this.page.waitForTimeout(1000);
    const norm = (t: string) => t.replace(/\s+/g, ' ').trim();
    const typed = await editor.innerText().catch(() => '');
    if (norm(typed) !== norm(text)) return 'texto no editor não bate';

    if (images.length) {
      const media = this.page.getByRole('button', { name: 'Media' }).first();
      const [chooser] = await Promise.all([
        this.page.waitForEvent('filechooser', { timeout: 10_000 }),
        media.click({ timeout: 6000 }),
      ]);
      await chooser.setFiles(images);
      await this.page.waitForTimeout(4000);
      const next = this.page
        .locator('button')
        .filter({ hasText: /^\s*(Next|Done|Avançar|Concluído)\s*$/i })
        .filter({ visible: true })
        .last();
      if (!(await next.isVisible().catch(() => false)))
        return 'editor de imagem não abriu';
      await next.click({ timeout: 6000 });
      await this.page.waitForTimeout(2500);
    }
    return undefined;
  }

  async publish(): Promise<string | undefined> {
    const post = this.page
      .locator('button')
      .filter({ hasText: /^\s*Post\s*$/ })
      .filter({ visible: true })
      .last();
    if (!(await post.isEnabled().catch(() => false)))
      return 'botão Post desabilitado';
    await this.human.pause(2000, 4000);
    await post.click({ timeout: 6000 });
    const closed = await this.page
      .locator('div.ProseMirror[role="textbox"]')
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    return closed ? undefined : 'o editor não fechou depois do Post';
  }

  async rehearse(
    text: string,
    images: string[],
  ): Promise<Record<string, unknown>> {
    if (!(await this.open())) return { error: 'não achei o "Start a post"' };
    const error = await this.fill(text, images);
    const screenshot = await shot(this.page, 'composer-filled');
    const postEnabled = await this.page
      .locator('button')
      .filter({ hasText: /^\s*Post\s*$/ })
      .filter({ visible: true })
      .last()
      .isEnabled()
      .catch(() => false);
    await this.close();
    return { error, postEnabled, screenshot };
  }

  async inspect(): Promise<Record<string, unknown>> {
    const opened = await this.open();
    const before = await shot(this.page, 'composer-open');
    const info = await this.page.evaluate(() => {
      const out: { buttons: string[]; editables: string[]; files: string[] } = {
        buttons: [],
        editables: [],
        files: [],
      };
      const walk = (root: Document | ShadowRoot) => {
        root.querySelectorAll('*').forEach((el) => {
          const e = el as HTMLElement;
          if (e.shadowRoot) walk(e.shadowRoot);
          const r = e.getBoundingClientRect();
          const visible = r.width > 0 && r.height > 0;
          if (e.tagName === 'BUTTON' && visible) {
            out.buttons.push(
              `${(e.getAttribute('aria-label') ?? '').slice(0, 50)}|${(e.innerText ?? '').trim().slice(0, 30)}`,
            );
          }
          if (e.getAttribute('contenteditable') === 'true' && visible) {
            out.editables.push(
              `${e.getAttribute('role') ?? ''}|${e.getAttribute('aria-label') ?? ''}|${e.className.toString().slice(0, 60)}`,
            );
          }
          if (
            e.tagName === 'INPUT' &&
            (e as HTMLInputElement).type === 'file'
          ) {
            out.files.push(`${(e as HTMLInputElement).accept}|${e.id}`);
          }
        });
      };
      walk(document);
      return out;
    });
    await this.close();
    return { opened, url: this.page.url(), screenshot: before, ...info };
  }

  async close(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => null);
    await this.page.waitForTimeout(1500);
    const discard = this.page
      .locator('button')
      .filter({ hasText: /^\s*(Discard|Descartar)\s*$/i })
      .filter({ visible: true })
      .first();
    if ((await discard.count().catch(() => 0)) > 0) {
      await discard.click({ timeout: 4000 }).catch(() => null);
    }
  }
}
