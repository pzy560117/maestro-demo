import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseResponseDto } from '../dto/base-response.dto';

/**
 * 全局HTTP异常过滤器
 * 捕获所有HTTP异常并统一处理
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    const errorMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || '请求处理失败';

    // 生成或获取traceId
    const traceId = (request.headers['x-trace-id'] as string) || crypto.randomUUID();

    // 构造错误响应
    const errorResponse: BaseResponseDto = {
      code: status === HttpStatus.BAD_REQUEST ? 400001 : status * 1000,
      message: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage,
      data: null,
      traceId,
    };

    // 记录错误日志
    this.logger.error(
      `[${traceId}] ${request.method} ${request.url} - Status: ${status} - ${errorResponse.message}`,
      exception.stack,
    );

    // 发送响应
    response.status(status).json(errorResponse);
  }
}
