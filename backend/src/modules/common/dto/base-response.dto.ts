import { ApiProperty } from '@nestjs/swagger';

/**
 * 统一响应体基类
 * 遵循API设计规范：{ code, message, data, traceId }
 */
export class BaseResponseDto<T = unknown> {
  @ApiProperty({ description: '响应码，0表示成功', example: 0 })
  code: number;

  @ApiProperty({ description: '响应消息', example: '操作成功' })
  message: string;

  @ApiProperty({ description: '响应数据' })
  data: T;

  @ApiProperty({ description: '追踪ID', example: 'uuid-trace-id' })
  traceId: string;

  constructor(code: number, message: string, data: T, traceId?: string) {
    this.code = code;
    this.message = message;
    this.data = data;
    this.traceId = traceId || crypto.randomUUID();
  }

  /**
   * 成功响应
   */
  static success<T>(data: T, message = '操作成功'): BaseResponseDto<T> {
    return new BaseResponseDto(0, message, data);
  }

  /**
   * 失败响应
   */
  static error(code: number, message: string, data?: unknown): BaseResponseDto {
    return new BaseResponseDto(code, message, data || null);
  }
}

