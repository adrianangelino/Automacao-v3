import { Injectable, Logger } from '@nestjs/common';
import { BrowserService } from '../browser/browser.service';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(private readonly browserService: BrowserService) {}

  private buildSearchUrl(term: string): string {
    const params = new URLSearchParams({
      keywords: term,
      sortBy: '"date_posted"',
      datePosted: '"past-week"',
    });
    return `https://www.linkedin.com/search/results/content/?${params}`;
  }

  async openSearch(term:string): Promise<void> {
    const page = await this.browserService.getPage();
    this.logger.log(`Buscando: "${term}"`);
    await page.goto(this.buildSearchUrl(term), { waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(5000)
  }
}
