import { Injectable, Logger } from '@nestjs/common';
import { ScreenStorageService, StoredAssetInfo } from './screen-storage.service';

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

  constructor(private readonly storageService: ScreenStorageService) {
    this.logger.log('Storage strategy delegated to ScreenStorageService');
  }

  /**
   * 初始化存储
   */
  async init(): Promise<void> {
    await this.storageService.init();
  }

  /**
   * 保存截图
   */
  async saveScreenshot(buffer: Buffer, appVersionId: string): Promise<StoredAssetInfo> {
    return await this.storageService.saveScreenshot(buffer, appVersionId);
  }

  /**
   * 保存缩略图
   */
  async saveThumbnail(buffer: Buffer, appVersionId: string): Promise<StoredAssetInfo> {
    return await this.storageService.saveThumbnail(buffer, appVersionId);
  }

  /**
   * 保存 DOM JSON
   */
  async saveDom(domData: any, appVersionId: string): Promise<StoredAssetInfo> {
    return await this.storageService.saveDom(domData, appVersionId);
  }

  /**
   * 读取截图
   */
  async readScreenshot(relativePath: string): Promise<Buffer> {
    return await this.storageService.readScreenshot(relativePath);
  }

  /**
   * 读取 DOM
   */
  async readDom(relativePath: string): Promise<any> {
    return await this.storageService.readDom(relativePath);
  }

  /**
   * 删除文件
   */
  async deleteFile(relativePath: string): Promise<void> {
    await this.storageService.deleteFile(relativePath);
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(relativePath: string): Promise<boolean> {
    return await this.storageService.fileExists(relativePath);
  }

  /**
   * 获取预签名 URL（仅 MinIO 支持）
   */
  async getPresignedUrl(objectPath: string, expirySeconds: number = 3600): Promise<string | null> {
    return await this.storageService.getPresignedUrl(objectPath, expirySeconds);
  }
}
