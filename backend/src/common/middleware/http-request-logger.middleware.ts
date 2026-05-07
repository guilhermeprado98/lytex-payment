import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import type { HttpLogPayload } from '../types/http-log.types';
import { AccessLogsService } from '../../access-logs/access-logs.service';

type RequestWithUser = Request & { user?: { userId?: string; email?: string } };

@Injectable()
export class HttpRequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(
    private readonly config: ConfigService,
    private readonly accessLogs: AccessLogsService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;
    const qIndex = originalUrl.indexOf('?');
    const pathOnly = qIndex === -1 ? originalUrl : originalUrl.slice(0, qIndex);
    const queryOnly = qIndex === -1 ? '' : originalUrl.slice(qIndex);
    const ip = req.ip ?? req.socket.remoteAddress ?? '';
    const userAgent = typeof req.get === 'function' ? (req.get('user-agent') ?? '') : '';

    res.on('finish', () => {
      const r = req as RequestWithUser;
      const u = r.user;
      const payload: HttpLogPayload = {
        ts: new Date().toISOString(),
        method,
        path: pathOnly,
        query: queryOnly,
        status: res.statusCode,
        durationMs: Date.now() - start,
        ip,
        userAgent: userAgent.slice(0, 200),
        userId: u?.userId ?? null,
        userEmail: u?.email ?? null,
      };
      const jsonMode = this.config.get<string>('LOG_FORMAT', 'text').toLowerCase() === 'json';
      const line = jsonMode ? JSON.stringify(payload) : this.formatLine(payload);

      if (res.statusCode >= 500) {
        this.logger.error(line);
      } else if (res.statusCode >= 400) {
        this.logger.warn(line);
      } else {
        this.logger.log(line);
      }

      const persist = this.config.get<string>('LOG_TO_DB', 'true').toLowerCase() !== 'false';
      if (persist) {
        this.accessLogs.enqueue(payload);
      }
    });

    next();
  }

  private formatLine(p: HttpLogPayload): string {
    const url = p.query ? `${p.path}${p.query}` : p.path;
    const user = p.userId ?? '-';
    return `${p.method} ${url} ${p.status} ${p.durationMs}ms ip=${p.ip} user=${user}`;
  }
}
