import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import { rmSync } from 'fs';
import pino from 'pino';
import { toDataURL } from 'qrcode';
import { BOT_CONFIG } from '../config/bot-config';
import type { BotConfig } from '../config/bot-config';
import { AutoRunService } from '../outreach/auto-run.service';
import { OUTREACH_EVENTS } from '../outreach/events';
import type {
  BlockedEvent,
  ContactedEvent,
  FollowUpEvent,
} from '../outreach/events';
import { OutreachRunner } from '../outreach/outreach-runner.service';
import { OutreachStore } from '../store/outreach-store';
import { HELP, parseCommand } from './commands';
import { formatRecent, formatStatus } from './format';

const PREFIX = '🤖 ';
const AUTH_DIR = 'data/whatsapp-auth';

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private socket?: WASocket;
  private selfJids = new Set<string>();
  private sentIds = new Set<string>();
  private stopping = false;
  connected = false;
  qrDataUrl?: string;

  constructor(
    @Inject(BOT_CONFIG) private readonly config: BotConfig,
    private readonly runner: OutreachRunner,
    private readonly auto: AutoRunService,
    private readonly store: OutreachStore,
  ) {}

  async onModuleInit() {
    if (this.config.whatsapp) await this.connect();
  }

  onModuleDestroy() {
    this.stopping = true;
    void this.socket?.end(undefined);
  }

  async send(text: string): Promise<void> {
    const [to] = [...this.selfJids];
    if (!this.socket || !this.connected || !to) return;
    const sent = await this.socket
      .sendMessage(to, { text: PREFIX + text })
      .catch((e: Error) => this.logger.warn(`falha ao enviar: ${e.message}`));
    if (sent?.key.id) this.sentIds.add(sent.key.id);
  }

  @OnEvent(OUTREACH_EVENTS.contacted)
  onContacted(e: ContactedEvent) {
    const what = e.messaged
      ? 'conexão + mensagem'
      : 'conexão (mensagem vai quando aceitar)';
    const role = e.role ? ` — ${e.role}` : '';
    return this.send(`✅ ${e.name}${role} [${e.kind}]\n${what}\n${e.postUrl}`);
  }

  @OnEvent(OUTREACH_EVENTS.followUp)
  onFollowUp(e: FollowUpEvent) {
    return this.send(`💬 ${e.name} aceitou a conexão, mensagem enviada.`);
  }

  @OnEvent(OUTREACH_EVENTS.blocked)
  onBlocked(e: BlockedEvent) {
    return this.send(
      `🚫 LinkedIn bloqueou: ${e.reason}.\nParei tudo. Confere a conta e me chama.`,
    );
  }

  private async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    const socket = makeWASocket({
      version,
      auth: state,
      logger: pino(
        { level: 'warn' },
        pino.destination({ dest: 'data/logs/whatsapp.log', mkdir: true }),
      ),
      browser: Browsers.macOS('Chrome'),
      markOnlineOnConnect: false,
    });
    this.socket = socket;

    socket.ev.on('creds.update', () => void saveCreds());

    socket.ev.on('connection.update', (update) => {
      if (update.qr) {
        void toDataURL(update.qr).then((url) => (this.qrDataUrl = url));
        this.logger.warn('WhatsApp: escaneie o QR em GET /whatsapp/qr');
      }

      if (update.connection === 'open') {
        this.connected = true;
        this.qrDataUrl = undefined;
        this.selfJids = new Set(
          [socket.user?.id, socket.user?.lid]
            .filter((jid): jid is string => !!jid)
            .map((jid) => jidNormalizedUser(jid)),
        );
        this.logger.log(
          `WhatsApp conectado (${[...this.selfJids].join(', ')})`,
        );
        void this.send('Tô online. Manda "ajuda" pra ver os comandos.');
      }

      if (update.connection === 'close') {
        this.connected = false;
        const code = (
          update.lastDisconnect?.error as { output?: { statusCode?: number } }
        )?.output?.statusCode;
        this.logger.warn(
          `WhatsApp caiu (código ${code ?? '?'}): ${update.lastDisconnect?.error?.message ?? ''}`,
        );
        if (code === DisconnectReason.loggedOut) {
          rmSync(AUTH_DIR, { recursive: true, force: true });
          this.logger.warn(
            'WhatsApp desconectado pelo celular: sessão apagada.',
          );
        }
        if (!this.stopping) setTimeout(() => void this.connect(), 5000);
      }
    });

    socket.ev.on('messages.upsert', ({ messages }) => {
      for (const message of messages) void this.handle(message);
    });
  }

  private async handle(message: WAMessage): Promise<void> {
    const jid = message.key.remoteJid;
    if (!jid || !message.key.fromMe) return;
    if (!this.selfJids.has(jidNormalizedUser(jid))) return;
    if (message.key.id && this.sentIds.delete(message.key.id)) return;

    const text =
      message.message?.conversation ??
      message.message?.extendedTextMessage?.text ??
      '';
    if (!text || text.startsWith(PREFIX)) return;

    await this.send(this.reply(text));
  }

  private reply(text: string): string {
    const command = parseCommand(text);
    switch (command.type) {
      case 'status':
        return formatStatus({
          status: this.runner.state.status,
          usage: this.store.usage(new Date()),
          totals: this.store.totals(),
          auto: this.auto.status(),
          block: this.runner.state.block,
        });
      case 'recent':
        return formatRecent(this.store.recent(8));
      case 'pause':
        this.auto.turnOff();
        return 'Automático pausado.';
      case 'resume':
        this.auto.turnOn();
        return `Automático ligado. Próxima: ${this.auto.status().nextRun}.`;
      case 'stop':
        this.runner.stop();
        return 'Beleza, termino o post atual e paro.';
      case 'run': {
        const started = this.runner.start({
          dryRun: !command.live,
          maxContacts: command.max,
        });
        if (!started.started) return `Não rodei: ${started.reason}`;
        return command.live
          ? `Rodando, até ${command.max} abordagens.`
          : 'Simulando (não manda nada).';
      }
      case 'help':
        return HELP;
      default:
        return 'Não entendi. Manda "ajuda".';
    }
  }
}
