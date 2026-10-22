import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { BOT_CONFIG } from '../config/bot-config';
import type { BotConfig } from '../config/bot-config';
import { isAuthorized } from './api-token';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(@Inject(BOT_CONFIG) private readonly config: BotConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ok = isAuthorized(
      {
        ip: request.socket.remoteAddress,
        authorization: request.headers.authorization,
      },
      this.config.apiToken,
    );
    if (!ok) throw new UnauthorizedException('token inválido');
    return true;
  }
}
