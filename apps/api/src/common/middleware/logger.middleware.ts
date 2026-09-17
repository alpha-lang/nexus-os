import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '-';

    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      const contentLength = res.get('content-length') || '0';

      const icon =
        statusCode >= 500 ? '💥' :
        statusCode >= 400 ? '⚠️' :
        statusCode >= 300 ? '↪️' :
        statusCode >= 200 ? '✅' :
        '•';

      const line = `${icon} ${method} ${originalUrl} ${statusCode} ${duration}ms ${contentLength}b — ${ip} — ${userAgent.slice(0, 60)}`;

      if (statusCode >= 500) {
        this.logger.error(line);
      } else if (statusCode >= 400) {
        this.logger.warn(line);
      } else {
        this.logger.log(line);
      }
    });

    next();
  }
}
