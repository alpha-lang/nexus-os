import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | object = 'Internal server error';
    const extra: Record<string, any> = {};

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else {
        const r = response as any;
        message = r.message || response;
        // Préserver les champs métier additionnels (code, organizations…)
        if (r.code) extra.code = r.code;
        if (r.organizations) extra.organizations = r.organizations;
        if (r.organization) extra.organization = r.organization;
        if (r.error && typeof r.error === 'string' && !extra.code) {
          extra.code = r.error;
        }
      }
    }

    const method = req.method;
    const path = req.url;
    const timestamp = new Date().toISOString();
    const requestId =
      (req.headers['x-vercel-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      '-';

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `💥 ${method} ${path} → ${status} — requestId=${requestId}\n${stack}`,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `⚠️ ${method} ${path} → ${status} — ${JSON.stringify(message)} — requestId=${requestId}`,
      );
    }

    res.status(status).json({
      statusCode: status,
      message,
      ...extra,
      path,
      method,
      timestamp,
      requestId,
    });
  }
}
