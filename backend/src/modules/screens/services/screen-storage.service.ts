import { Injectable, Logger } from '@nestjs/common';
import { MinioService } from '../../integrations/storage/minio.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * 界面存储服务
 * 功能 G：界面签名与存档（FR-09）
 *
 * 职责：
 * 1. 保存截图文件（支持压缩、缩略图）
 * 2. 保存 DOM JSON 文件
 * 3. 管理文件路径和命名
 * 4. 清理过期文件
 *
 * 说明：
 * - 默认使用本地文件系统存储
 * - 后续可扩展为 MinIO/S3
 */
export interface StoredAssetInfo {
  /** 存储在本地或对象存储中的相对路径 */
  relativePath: string;
  /** 绝对路径（本地文件系统） */
  absolutePath: string;
  /** 对象存储路径（bucket/objectName） */
  objectPath?: string | null;
  /** 预签名的公网访问地址 */
  publicUrl?: string | null;
  /** 预签名地址的过期时间 */
  expiresAt?: Date | null;
}

@Injectable()
export class ScreenStorageService {
  private readonly logger = new Logger(ScreenStorageService.name);
  private readonly baseDir: string;
  private readonly minioEnabled: boolean;
  private readonly presignedExpirySeconds: number;

  constructor(private readonly minioService: MinioService) {
    // 存储根目录
    this.baseDir = process.env.STORAGE_BASE_DIR || path.join(process.cwd(), 'storage');
    this.minioEnabled = process.env.MINIO_ENABLED === 'true';
    this.presignedExpirySeconds = Number.parseInt(
      process.env.MINIO_PRESIGNED_EXPIRY_SECONDS || '300',
      10,
    );
  }

  /**
   * 初始化存储目录
   */
  async init(): Promise<void> {
    await this.ensureDir(path.join(this.baseDir, 'screenshots'));
    await this.ensureDir(path.join(this.baseDir, 'thumbnails'));
    await this.ensureDir(path.join(this.baseDir, 'dom'));
    this.logger.log(`Storage initialized at ${this.baseDir}`);
  }

  /**
   * 保存截图
   *
   * @param buffer - 截图文件内容
   * @param appVersionId - 应用版本 ID
   * @returns 相对路径
   */
  async saveScreenshot(buffer: Buffer, appVersionId: string): Promise<StoredAssetInfo> {
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const yearMonth = this.getYearMonth();
    const fileName = `screen_${hash}.webp`;
    const relativePath = path.join('screenshots', yearMonth, fileName);
    const fullPath = path.join(this.baseDir, relativePath);

    await this.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, buffer);

    this.logger.debug(`Screenshot saved: ${relativePath}`);

    const assetInfo: StoredAssetInfo = {
      relativePath,
      absolutePath: fullPath,
    };

    if (this.minioEnabled) {
      try {
        const objectPath = await this.minioService.uploadScreenshot(buffer, appVersionId, {
          'app-version-id': appVersionId,
        });
        assetInfo.objectPath = objectPath;
        const publicUrl = await this.generatePresignedUrl(objectPath);
        if (publicUrl) {
          assetInfo.publicUrl = publicUrl;
          assetInfo.expiresAt = new Date(Date.now() + this.presignedExpirySeconds * 1000);
        }
      } catch (error) {
        const err = error as Error;
        this.logger.warn(`MinIO upload failed for screenshot ${relativePath}: ${err.message}`);
      }
    }

    return assetInfo;
  }

  /**
   * 保存缩略图
   *
   * @param buffer - 缩略图文件内容
   * @param appVersionId - 应用版本 ID
   * @returns 相对路径
   */
  async saveThumbnail(buffer: Buffer, appVersionId: string): Promise<StoredAssetInfo> {
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const yearMonth = this.getYearMonth();
    const fileName = `thumb_${hash}.webp`;
    const relativePath = path.join('thumbnails', yearMonth, fileName);
    const fullPath = path.join(this.baseDir, relativePath);

    await this.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, buffer);

    this.logger.debug(`Thumbnail saved: ${relativePath}`);

    const assetInfo: StoredAssetInfo = {
      relativePath,
      absolutePath: fullPath,
    };

    if (this.minioEnabled) {
      try {
        const objectPath = await this.minioService.uploadThumbnail(buffer, appVersionId, {
          'app-version-id': appVersionId,
        });
        assetInfo.objectPath = objectPath;
        const publicUrl = await this.generatePresignedUrl(objectPath);
        if (publicUrl) {
          assetInfo.publicUrl = publicUrl;
          assetInfo.expiresAt = new Date(Date.now() + this.presignedExpirySeconds * 1000);
        }
      } catch (error) {
        const err = error as Error;
        this.logger.warn(`MinIO upload failed for thumbnail ${relativePath}: ${err.message}`);
      }
    }

    return assetInfo;
  }

  /**
   * 保存 DOM JSON
   *
   * @param domData - DOM 数据对象
   * @param appVersionId - 应用版本 ID
   * @returns 相对路径
   */
  async saveDom(domData: any, appVersionId: string): Promise<StoredAssetInfo> {
    const jsonString = JSON.stringify(domData, null, 2);
    const hash = crypto.createHash('md5').update(jsonString).digest('hex');
    const yearMonth = this.getYearMonth();
    const fileName = `dom_${hash}.json`;
    const relativePath = path.join('dom', yearMonth, fileName);
    const fullPath = path.join(this.baseDir, relativePath);

    await this.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, jsonString, 'utf-8');

    this.logger.debug(`DOM saved: ${relativePath}`);

    const assetInfo: StoredAssetInfo = {
      relativePath,
      absolutePath: fullPath,
    };

    if (this.minioEnabled) {
      try {
        const objectPath = await this.minioService.uploadDom(domData, appVersionId, {
          'app-version-id': appVersionId,
        });
        assetInfo.objectPath = objectPath;
        const publicUrl = await this.generatePresignedUrl(objectPath);
        if (publicUrl) {
          assetInfo.publicUrl = publicUrl;
          assetInfo.expiresAt = new Date(Date.now() + this.presignedExpirySeconds * 1000);
        }
      } catch (error) {
        const err = error as Error;
        this.logger.warn(`MinIO upload failed for dom ${relativePath}: ${err.message}`);
      }
    }

    return assetInfo;
  }

  /**
   * 读取截图
   *
   * @param relativePath - 相对路径
   * @returns 文件内容
   */
  async readScreenshot(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, relativePath);
    return await fs.readFile(fullPath);
  }

  /**
   * 读取 DOM
   *
   * @param relativePath - 相对路径
   * @returns DOM 数据对象
   */
  async readDom(relativePath: string): Promise<any> {
    const fullPath = path.join(this.baseDir, relativePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 删除文件
   *
   * @param relativePath - 相对路径
   */
  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, relativePath);
    try {
      await fs.unlink(fullPath);
      this.logger.debug(`File deleted: ${relativePath}`);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${relativePath}: ${(error as Error).message}`);
    }
  }

  /**
   * 检查文件是否存在
   *
   * @param relativePath - 相对路径
   * @returns 是否存在
   */
  async fileExists(relativePath: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, relativePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 将存储相对路径解析为绝对路径
   */
  resolveAbsolutePath(relativePath: string): string {
    return path.join(this.baseDir, relativePath);
  }

  /**
   * 获取预签名 URL（用于已有对象刷新访问权限）
   */
  async getPresignedUrl(objectPath: string, expirySeconds?: number): Promise<string | null> {
    if (!this.minioEnabled) {
      this.logger.warn('Presigned URL not supported because MinIO is disabled');
      return null;
    }

    try {
      return await this.minioService.getPresignedUrl(
        objectPath,
        expirySeconds ?? this.presignedExpirySeconds,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Failed to get presigned URL for ${objectPath}: ${err.message}`);
      return null;
    }
  }

  /**
   * 获取年月目录名（用于分组存储）
   */
  private getYearMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * 为指定对象生成预签名访问地址
   */
  private async generatePresignedUrl(objectPath: string): Promise<string | null> {
    return await this.getPresignedUrl(objectPath, this.presignedExpirySeconds);
  }

  /**
   * 确保目录存在
   */
  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create directory ${dir}: ${(error as Error).message}`);
      throw error;
    }
  }
}
