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
 * 全局异常过滤器
 * 捕获所有未处理的异常
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 判断是否为HTTP异常
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // 生成traceId
    const traceId = (request.headers['x-trace-id'] as string) || crypto.randomUUID();

    // 获取错误消息
    let message = '服务器内部错误';
    if (isHttpException) {
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 构造错误响应
    const errorResponse: BaseResponseDto = {
      code: status * 1000,
      message: Array.isArray(message) ? message.join(', ') : message,
      data: null,
      traceId,
    };

    // 记录错误日志（包含堆栈信息）
    this.logger.error(
      `[${traceId}] ${request.method} ${request.url} - Status: ${status} - ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // 生产环境不暴露详细错误信息
    if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.message = '服务器内部错误，请联系管理员';
    }

    // 发送响应
    response.status(status).json(errorResponse);
  }
}
