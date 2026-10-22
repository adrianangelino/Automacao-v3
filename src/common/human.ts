import { Page } from 'playwright';

export class Human {
  constructor(private readonly pace = 1) {}

  pause(minMs: number, maxMs: number): Promise<void> {
    const ms = Math.floor(
      (minMs + Math.random() * (maxMs - minMs)) * this.pace,
    );
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async scroll(
    page: Page,
    direction: 'down' | 'up' = 'down',
    amount = 500,
  ): Promise<void> {
    const total = amount + (Math.random() - 0.5) * 200;
    const steps = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(
        0,
        (direction === 'down' ? total : -total) / steps,
      );
      await this.pause(120, 350);
    }
  }

  async browse(page: Page, rounds = 2): Promise<void> {
    for (let i = 0; i < rounds; i++) {
      await this.scroll(page, 'down', 450 + Math.random() * 350);
      await this.pause(2500, 6000);
      if (Math.random() < 0.25) {
        await this.scroll(page, 'up', 200);
        await this.pause(1500, 3000);
      }
    }
    await page
      .evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
      .catch(() => null);
    await this.pause(1500, 3000);
  }
}
