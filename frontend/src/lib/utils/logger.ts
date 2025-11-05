/**
 * 前端日志工具
 * 统一管理所有前端日志输出
 * 支持不同日志级别和格式化输出
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogOptions {
  module?: string;
  data?: any;
  error?: Error;
}

class Logger {
  private enabledLevels: Set<LogLevel>;

  constructor() {
    // 默认启用所有日志级别（包括DEBUG）
    this.enabledLevels = new Set([LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]);
  }

  /**
   * 格式化日志输出
   */
  private format(level: LogLevel, message: string, options?: LogOptions): void {
    if (!this.enabledLevels.has(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const module = options?.module || 'App';
    const prefix = `[${timestamp}] [${level}] [${module}]`;

    const style = this.getStyle(level);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`%c${prefix}`, style, message, options?.data || '');
        break;
      case LogLevel.INFO:
        console.info(`%c${prefix}`, style, message, options?.data || '');
        break;
      case LogLevel.WARN:
        console.warn(`%c${prefix}`, style, message, options?.data || '');
        break;
      case LogLevel.ERROR:
        console.error(`%c${prefix}`, style, message, options?.error || options?.data || '');
        if (options?.error?.stack) {
          console.error(options.error.stack);
        }
        break;
    }
  }

  /**
   * 获取日志样式
   */
  private getStyle(level: LogLevel): string {
    const baseStyle = 'font-weight: bold; padding: 2px 4px; border-radius: 2px;';
    
    switch (level) {
      case LogLevel.DEBUG:
        return `${baseStyle} background: #6c757d; color: white;`;
      case LogLevel.INFO:
        return `${baseStyle} background: #0dcaf0; color: white;`;
      case LogLevel.WARN:
        return `${baseStyle} background: #ffc107; color: black;`;
      case LogLevel.ERROR:
        return `${baseStyle} background: #dc3545; color: white;`;
      default:
        return baseStyle;
    }
  }

  /**
   * DEBUG 级别日志
   */
  debug(message: string, options?: LogOptions): void {
    this.format(LogLevel.DEBUG, message, options);
  }

  /**
   * INFO 级别日志
   */
  info(message: string, options?: LogOptions): void {
    this.format(LogLevel.INFO, message, options);
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, options?: LogOptions): void {
    this.format(LogLevel.WARN, message, options);
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, options?: LogOptions): void {
    this.format(LogLevel.ERROR, message, options);
  }

  /**
   * 启用指定日志级别
   */
  enable(level: LogLevel): void {
    this.enabledLevels.add(level);
  }

  /**
   * 禁用指定日志级别
   */
  disable(level: LogLevel): void {
    this.enabledLevels.delete(level);
  }

  /**
   * 启用所有日志级别
   */
  enableAll(): void {
    this.enabledLevels = new Set([LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]);
  }

  /**
   * 禁用所有日志级别
   */
  disableAll(): void {
    this.enabledLevels.clear();
  }
}

// 导出单例
export const logger = new Logger();

// 开发环境自动启用所有日志
if (import.meta.env.DEV) {
  logger.enableAll();
  logger.info('Logger initialized in development mode', {
    module: 'Logger',
    data: { enabledLevels: ['DEBUG', 'INFO', 'WARN', 'ERROR'] },
  });
}

