import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * 日志拦截器
 * 记录所有HTTP请求和响应
 * 遵循日志规范：结构化日志、包含traceId、耗时、请求参数等
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, url, body, query, params, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const traceId = headers['x-trace-id'] || this.generateTraceId();

    // 请求开始时间
    const startTime = Date.now();

    // 记录请求日志
    this.logger.log({
      type: 'REQUEST',
      traceId,
      method,
      url,
      query,
      params,
      body: this.sanitizeBody(body),
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          // 请求结束时间
          const endTime = Date.now();
          const duration = endTime - startTime;
          const statusCode = response.statusCode;

          // 记录响应日志
          this.logger.log({
            type: 'RESPONSE',
            traceId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            success: statusCode < 400,
            timestamp: new Date().toISOString(),
          });
        },
        error: (error) => {
          // 请求错误时间
          const endTime = Date.now();
          const duration = endTime - startTime;

          // 记录错误日志
          this.logger.error({
            type: 'ERROR',
            traceId,
            method,
            url,
            duration: `${duration}ms`,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }

  /**
   * 生成traceId
   */
  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 脱敏敏感字段
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    }

    return sanitized;
  }
}
