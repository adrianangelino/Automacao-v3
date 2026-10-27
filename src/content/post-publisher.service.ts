import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BrowserService } from '../browser/browser.service';
import { Human } from '../common/human';
import { BOT_CONFIG } from '../config/bot-config';
import type { BotConfig } from '../config/bot-config';
import { detectBlock } from '../limits/block-detector';
import { PostComposer } from '../linkedin/post-composer';
import { ContentStore } from './content-store';
import type { PostRow } from './content-store';
import { CONTENT_MESSAGE } from './content.service';

@Injectable()
export class PostPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostPublisher.name);
  private timer?: NodeJS.Timeout;
  private busy = false;

  constructor(
    private readonly store: ContentStore,
    private readonly browser: BrowserService,
    private readonly events: EventEmitter2,
    @Inject(BOT_CONFIG) private readonly config: BotConfig,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 5 * 60_000);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    if (this.busy) return;
    const [post] = this.store.due(new Date());
    if (!post) return;
    this.busy = true;
    try {
      await this.publish(post);
    } finally {
      this.busy = false;
    }
  }

  private async publish(post: PostRow): Promise<void> {
    const tab = await this.browser.newTab();
    const composer = new PostComposer(tab, new Human(this.config.pace));
    try {
      if (!(await composer.open())) {
        const text = await tab
          .locator('body')
          .innerText()
          .catch(() => '');
        const block = detectBlock(tab.url(), text);
        throw new Error(
          block.blocked
            ? `LinkedIn: ${block.reason}`
            : 'não achei o "Start a post"',
        );
      }
      const fillError = await composer.fill(post.text ?? '', post.images);
      if (fillError) throw new Error(fillError);
      const publishError = await composer.publish();
      if (publishError) throw new Error(publishError);

      this.store.markPublished(post.id, new Date());
      this.logger.log(`post ${post.id} publicado`);
      this.events.emit(CONTENT_MESSAGE, '✅ Post publicado no LinkedIn!');
    } catch (error) {
      await composer.close();
      this.store.setStatus(post.id, 'failed');
      const message = (error as Error).message;
      this.logger.warn(`post ${post.id} falhou: ${message}`);
      this.events.emit(
        CONTENT_MESSAGE,
        `❌ Não consegui publicar o post: ${message}. Ele ficou salvo, dá pra ver em localhost:3999/post.`,
      );
    } finally {
      await tab.close().catch(() => null);
    }
  }
}
