import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务异常类
 * 统一的业务错误处理，遵循错误处理规范
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly code: number,
    public readonly message: string,
    public readonly details?: unknown,
    public readonly httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      httpStatus,
    );
  }

  /**
   * 资源未找到
   */
  static notFound(resource: string, identifier?: string): BusinessException {
    return new BusinessException(
      404001,
      `${resource}不存在${identifier ? `: ${identifier}` : ''}`,
      { resource, identifier },
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * 资源已存在
   */
  static alreadyExists(resource: string, identifier: string): BusinessException {
    return new BusinessException(
      409001,
      `${resource}已存在: ${identifier}`,
      { resource, identifier },
      HttpStatus.CONFLICT,
    );
  }

  /**
   * 参数验证失败
   */
  static validationFailed(field: string, message: string): BusinessException {
    return new BusinessException(400001, `参数验证失败: ${field} - ${message}`, { field });
  }

  /**
   * 资源不可用
   */
  static unavailable(resource: string, reason: string): BusinessException {
    return new BusinessException(
      503001,
      `${resource}不可用: ${reason}`,
      { resource, reason },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * 操作冲突
   */
  static conflict(message: string, details?: unknown): BusinessException {
    return new BusinessException(409002, message, details, HttpStatus.CONFLICT);
  }

  /**
   * 错误请求
   */
  static badRequest(message: string, details?: unknown): BusinessException {
    return new BusinessException(400002, message, details, HttpStatus.BAD_REQUEST);
  }
}

