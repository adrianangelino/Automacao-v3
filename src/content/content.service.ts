import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { mkdirSync, writeFileSync } from 'fs';
import { BOT_CONFIG } from '../config/bot-config';
import type { BotConfig } from '../config/bot-config';
import { ContentStore } from './content-store';
import type { PostRow } from './content-store';
import { nextPostSlot, nextPromptAt } from './schedule';
import { checkStyle } from './style-check';
import { translatePost } from './translator';

export const CONTENT_MESSAGE = 'content.message';

export type Reply = string | { text: string; images: string[] };

export type IncomingContent =
  { text: string } | { image: Buffer; mimetype?: string };

const QUESTION =
  'Bora montar o post da semana? Me conta o que tu fez ou resolveu (problema, número, erro, aprendizado). Pode mandar em várias mensagens e com prints. Quando terminar, manda "pronto".';

const formatDate = (d: Date) =>
  d.toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

@Injectable()
export class ContentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContentService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly store: ContentStore,
    private readonly events: EventEmitter2,
    @Inject(BOT_CONFIG) private readonly config: BotConfig,
  ) {}

  onModuleInit() {
    if (this.config.whatsapp) this.schedulePrompt();
  }

  onModuleDestroy() {
    clearTimeout(this.timer);
  }

  async handle(input: IncomingContent): Promise<Reply | undefined> {
    const post = this.store.active();

    if ('image' in input) {
      if (post?.status !== 'collecting') return undefined;
      const ext = input.mimetype?.includes('png') ? 'png' : 'jpg';
      const dir = `data/media/${post.id}`;
      mkdirSync(dir, { recursive: true });
      const path = `${dir}/${Date.now()}.${ext}`;
      writeFileSync(path, input.image);
      this.store.addImage(post.id, path);
      return `🖼️ Print salvo (${post.images.length + 1}).`;
    }

    const text = input.text.trim();
    const command = text.toLowerCase();

    if (command === 'ver') {
      if (!post) return 'Nenhum post em andamento. Manda "post" pra começar.';
      if (post.status === 'collecting') {
        return {
          text: `Até agora:\n\n${post.notes || '(nada anotado)'}\n\nManda mais ou "pronto".`,
          images: post.images,
        };
      }
      return this.preview(post);
    }

    if (!post) {
      if (command !== 'post') return undefined;
      this.store.start(new Date());
      return QUESTION;
    }

    if (['cancelar', 'pular'].includes(command)) {
      this.skip(post.id);
      return 'Post descartado.';
    }

    if (post.status === 'collecting') {
      if (command !== 'pronto') {
        this.store.appendNote(post.id, text);
        return '📝 Anotado. Manda mais ou "pronto".';
      }
      if (!post.notes)
        return 'Ainda não tem nada anotado. Me conta o que tu fez.';
      return this.draft(post);
    }

    if (command === 'publicar agora') {
      this.publishNow(post.id);
      return '🚀 Vou publicar nos próximos minutos.';
    }
    if (command === 'ok') {
      return `✅ Agendado pra ${formatDate(this.approve(post.id))}.`;
    }
    if (command === 'refazer') return this.draft(post);
    if (command.startsWith('editar ')) {
      this.store.setDraft(post.id, text.slice('editar '.length).trim());
      return this.preview(this.store.get(post.id)!);
    }
    return 'Responde: ok / publicar agora / editar <texto em inglês> / refazer / pular.';
  }

  approve(id: number): Date {
    const slot = nextPostSlot(new Date(), this.store.scheduledDates());
    this.store.schedule(id, slot);
    return slot;
  }

  publishNow(id: number): void {
    this.store.schedule(id, new Date());
  }

  skip(id: number): void {
    this.store.setStatus(id, 'skipped');
  }

  private async draft(post: PostRow): Promise<Reply> {
    try {
      const text = await translatePost(
        post.notes,
        this.config.groqApiKey,
        fetch,
        this.config.groqModel,
      );
      this.store.setDraft(post.id, text);
      return this.preview(this.store.get(post.id)!);
    } catch (error) {
      return `Não consegui traduzir: ${(error as Error).message}. Tenta "refazer" daqui a pouco.`;
    }
  }

  private preview(post: PostRow): Reply {
    const issues = checkStyle(post.text ?? '');
    const warning = issues.length ? `\n⚠️ ${issues.join('; ')}` : '';
    return {
      text: `${post.text}\n\n———${warning}\n👀 localhost:3999/post\nResponde: ok / publicar agora / editar <texto em inglês> / refazer / pular`,
      images: post.images,
    };
  }

  private schedulePrompt(): void {
    const at = nextPromptAt(new Date());
    this.timer = setTimeout(() => {
      if (!this.store.active()) {
        this.store.start(new Date());
        this.events.emit(CONTENT_MESSAGE, QUESTION);
      }
      this.schedulePrompt();
    }, at.getTime() - Date.now());
    this.logger.log(`📝 próxima pergunta de post: ${formatDate(at)}`);
  }
}
