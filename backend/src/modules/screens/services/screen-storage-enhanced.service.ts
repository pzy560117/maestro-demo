import { Injectable, Logger } from '@nestjs/common';
import { MinioService } from '../../integrations/storage/minio.service';
import { ScreenStorageService } from './screen-storage.service';

/**
 * 增强的界面存储服务
 * 支持本地文件系统和 MinIO 对象存储
 * 
 * 策略：
 * - 如果 MinIO 启用，优先使用 MinIO
 * - 否则回退到本地文件系统
 */
@Injectable()
export class ScreenStorageEnhancedService {
  private readonly logger = new Logger(ScreenStorageEnhancedService.name);
  private readonly useMinIO: boolean;

  constructor(
    private readonly minioService: MinioService,
    private readonly localStorageService: ScreenStorageService,
  ) {
    this.useMinIO = process.env.MINIO_ENABLED === 'true';
    this.logger.log(`Storage strategy: ${this.useMinIO ? 'MinIO' : 'Local FileSystem'}`);
  }

  /**
   * 初始化存储
   */
  async init(): Promise<void> {
    if (!this.useMinIO) {
      await this.localStorageService.init();
    }
  }

  /**
   * 保存截图
   */
  async saveScreenshot(buffer: Buffer, appVersionId: string): Promise<string> {
    if (this.useMinIO) {
      return await this.minioService.uploadScreenshot(buffer, appVersionId, {
        'app-version-id': appVersionId,
      });
    } else {
      return await this.localStorageService.saveScreenshot(buffer, appVersionId);
    }
  }

  /**
   * 保存缩略图
   */
  async saveThumbnail(buffer: Buffer, appVersionId: string): Promise<string> {
    if (this.useMinIO) {
      return await this.minioService.uploadThumbnail(buffer, appVersionId, {
        'app-version-id': appVersionId,
      });
    } else {
      return await this.localStorageService.saveThumbnail(buffer, appVersionId);
    }
  }

  /**
   * 保存 DOM JSON
   */
  async saveDom(domData: any, appVersionId: string): Promise<string> {
    if (this.useMinIO) {
      return await this.minioService.uploadDom(domData, appVersionId, {
        'app-version-id': appVersionId,
      });
    } else {
      return await this.localStorageService.saveDom(domData, appVersionId);
    }
  }

  /**
   * 读取截图
   */
  async readScreenshot(relativePath: string): Promise<Buffer> {
    if (this.useMinIO) {
      return await this.minioService.downloadFile(relativePath);
    } else {
      return await this.localStorageService.readScreenshot(relativePath);
    }
  }

  /**
   * 读取 DOM
   */
  async readDom(relativePath: string): Promise<any> {
    if (this.useMinIO) {
      const buffer = await this.minioService.downloadFile(relativePath);
      return JSON.parse(buffer.toString('utf-8'));
    } else {
      return await this.localStorageService.readDom(relativePath);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(relativePath: string): Promise<void> {
    if (this.useMinIO) {
      await this.minioService.deleteFile(relativePath);
    } else {
      await this.localStorageService.deleteFile(relativePath);
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(relativePath: string): Promise<boolean> {
    if (this.useMinIO) {
      return await this.minioService.fileExists(relativePath);
    } else {
      return await this.localStorageService.fileExists(relativePath);
    }
  }

  /**
   * 获取预签名 URL（仅 MinIO 支持）
   */
  async getPresignedUrl(relativePath: string, expirySeconds: number = 3600): Promise<string | null> {
    if (this.useMinIO) {
      return await this.minioService.getPresignedUrl(relativePath, expirySeconds);
    } else {
      this.logger.warn('Presigned URL not supported for local file system');
      return null;
    }
  }
}

