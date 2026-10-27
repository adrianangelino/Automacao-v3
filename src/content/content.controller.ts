import {
  Controller,
  Get,
  Inject,
  Post,
  Header,
  NotFoundException,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { BrowserService } from '../browser/browser.service';
import { Human } from '../common/human';
import { BOT_CONFIG } from '../config/bot-config';
import type { BotConfig } from '../config/bot-config';
import { PostComposer } from '../linkedin/post-composer';
import { ContentStore } from './content-store';
import { ContentService } from './content.service';
import { renderPostPage } from './post-page';

@Controller('post')
export class ContentController {
  constructor(
    private readonly store: ContentStore,
    private readonly content: ContentService,
    private readonly browser: BrowserService,
    @Inject(BOT_CONFIG) private readonly config: BotConfig,
  ) {}

  @Get('list')
  list() {
    return this.store.list();
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return { scheduledFor: this.content.approve(this.postId(id)) };
  }

  @Post(':id/publish-now')
  publishNow(@Param('id') id: string) {
    this.content.publishNow(this.postId(id));
    return { ok: true };
  }

  @Post(':id/skip')
  skip(@Param('id') id: string) {
    this.content.skip(this.postId(id));
    return { ok: true };
  }

  private postId(id: string): number {
    const post = /^\d+$/.test(id) ? this.store.get(Number(id)) : undefined;
    if (!post) throw new NotFoundException('post não encontrado');
    return post.id;
  }

  @Post('debug/composer')
  async inspectComposer() {
    const tab = await this.browser.getProfileTab();
    return new PostComposer(tab, new Human(this.config.pace)).inspect();
  }

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  page() {
    return renderPostPage(this.store.active() ?? this.store.latest());
  }

  @Get('media/:postId/:file')
  media(@Param('postId') postId: string, @Param('file') file: string) {
    if (!/^\d+$/.test(postId) || !/^[\w.-]+$/.test(file)) {
      throw new NotFoundException();
    }
    const path = `data/media/${postId}/${file}`;
    if (!existsSync(path)) throw new NotFoundException();
    return new StreamableFile(createReadStream(path), {
      type: file.endsWith('.png') ? 'image/png' : 'image/jpeg',
    });
  }
}
