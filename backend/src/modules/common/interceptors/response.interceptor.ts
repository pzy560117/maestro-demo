import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseResponseDto } from '../dto/base-response.dto';

/**
 * 响应拦截器
 * 统一包装API响应格式
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, BaseResponseDto<T>> {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<BaseResponseDto<T>> {
    const request = context.switchToHttp().getRequest();
    const traceId = request.headers['x-trace-id'] || crypto.randomUUID();

    return next.handle().pipe(
      map((data) => {
        // 如果返回的已经是BaseResponseDto，直接返回
        if (data instanceof BaseResponseDto) {
          return data;
        }

        // 否则包装成统一格式
        return BaseResponseDto.success(data);
      }),
    );
  }
}

