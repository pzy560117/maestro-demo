import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import * as crypto from 'crypto';

/**
 * MinIO 对象存储服务
 * 
 * 职责：
 * 1. 管理对象存储连接
 * 2. 上传/下载文件
 * 3. 生成预签名 URL
 * 4. 管理存储桶
 * 
 * 存储结构：
 * - maestro-screenshots/ - 截图文件
 * - maestro-thumbnails/ - 缩略图文件
 * - maestro-dom/ - DOM JSON 文件
 * - maestro-validations/ - 验证截图
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: MinioClient | null = null;
  private readonly enabled: boolean;
  private readonly buckets = {
    screenshots: 'maestro-screenshots',
    thumbnails: 'maestro-thumbnails',
    dom: 'maestro-dom',
    validations: 'maestro-validations',
  };

  constructor() {
    this.enabled = process.env.MINIO_ENABLED === 'true';

    if (this.enabled) {
      this.initializeClient();
    }
  }

  /**
   * 初始化 MinIO 客户端
   */
  private initializeClient(): void {
    try {
      this.client = new MinioClient({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      });

      this.logger.log('MinIO client initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize MinIO client: ${(error as Error).message}`);
      this.client = null;
    }
  }

  /**
   * 模块初始化时创建存储桶
   */
  async onModuleInit() {
    if (!this.enabled || !this.client) {
      this.logger.warn('MinIO service is disabled or not initialized');
      return;
    }

    try {
      await this.ensureBuckets();
      this.logger.log('MinIO service ready');
    } catch (error) {
      this.logger.error(`Failed to initialize buckets: ${(error as Error).message}`);
    }
  }

  /**
   * 确保所有存储桶存在
   */
  private async ensureBuckets(): Promise<void> {
    if (!this.client) return;

    for (const [name, bucketName] of Object.entries(this.buckets)) {
      try {
        const exists = await this.client.bucketExists(bucketName);
        if (!exists) {
          await this.client.makeBucket(bucketName, 'us-east-1');
          this.logger.log(`Created bucket: ${bucketName}`);
        }
      } catch (error) {
        this.logger.error(`Failed to ensure bucket ${bucketName}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * 上传截图
   * 
   * @param buffer - 文件内容
   * @param appVersionId - 应用版本 ID
   * @param metadata - 元数据
   * @returns 对象路径
   */
  async uploadScreenshot(
    buffer: Buffer,
    appVersionId: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('MinIO client not initialized');
    }

    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const yearMonth = this.getYearMonth();
    const objectName = `${yearMonth}/screen_${hash}.webp`;

    try {
      await this.client.putObject(
        this.buckets.screenshots,
        objectName,
        buffer,
        buffer.length,
        {
          'Content-Type': 'image/webp',
          ...metadata,
        },
      );

      this.logger.log(`Screenshot uploaded: ${objectName}`);

      return `${this.buckets.screenshots}/${objectName}`;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to upload screenshot: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 上传缩略图
   */
  async uploadThumbnail(
    buffer: Buffer,
    appVersionId: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('MinIO client not initialized');
    }

    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const yearMonth = this.getYearMonth();
    const objectName = `${yearMonth}/thumb_${hash}.webp`;

    try {
      await this.client.putObject(
        this.buckets.thumbnails,
        objectName,
        buffer,
        buffer.length,
        {
          'Content-Type': 'image/webp',
          ...metadata,
        },
      );

      this.logger.log(`Thumbnail uploaded: ${objectName}`);

      return `${this.buckets.thumbnails}/${objectName}`;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to upload thumbnail: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 上传 DOM JSON
   */
  async uploadDom(
    domData: any,
    appVersionId: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('MinIO client not initialized');
    }

    const jsonString = JSON.stringify(domData, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const yearMonth = this.getYearMonth();
    const objectName = `${yearMonth}/dom_${hash}.json`;

    try {
      await this.client.putObject(
        this.buckets.dom,
        objectName,
        buffer,
        buffer.length,
        {
          'Content-Type': 'application/json',
          ...metadata,
        },
      );

      this.logger.log(`DOM uploaded: ${objectName}`);

      return `${this.buckets.dom}/${objectName}`;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to upload DOM: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 下载文件
   * 
   * @param objectPath - 对象路径（包含 bucket 名称）
   * @returns 文件内容
   */
  async downloadFile(objectPath: string): Promise<Buffer> {
    if (!this.client) {
      throw new Error('MinIO client not initialized');
    }

    try {
      const [bucketName, ...objectNameParts] = objectPath.split('/');
      const objectName = objectNameParts.join('/');

      const stream = await this.client.getObject(bucketName, objectName);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to download file: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 生成预签名 URL（用于临时访问）
   * 
   * @param objectPath - 对象路径
   * @param expirySeconds - 过期时间（秒）
   * @returns 预签名 URL
   */
  async getPresignedUrl(objectPath: string, expirySeconds: number = 3600): Promise<string> {
    if (!this.client) {
      throw new Error('MinIO client not initialized');
    }

    try {
      const [bucketName, ...objectNameParts] = objectPath.split('/');
      const objectName = objectNameParts.join('/');

      const url = await this.client.presignedGetObject(bucketName, objectName, expirySeconds);

      this.logger.debug(`Generated presigned URL for ${objectPath}`);

      return url;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to generate presigned URL: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(objectPath: string): Promise<void> {
    if (!this.client) {
      throw new Error('MinIO client not initialized');
    }

    try {
      const [bucketName, ...objectNameParts] = objectPath.split('/');
      const objectName = objectNameParts.join('/');

      await this.client.removeObject(bucketName, objectName);

      this.logger.log(`File deleted: ${objectPath}`);
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Failed to delete file ${objectPath}: ${err.message}`);
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(objectPath: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const [bucketName, ...objectNameParts] = objectPath.split('/');
      const objectName = objectNameParts.join('/');

      await this.client.statObject(bucketName, objectName);
      return true;
    } catch (error) {
      return false;
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
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: string;
    enabled: boolean;
    bucketsReady: boolean;
  }> {
    if (!this.enabled || !this.client) {
      return {
        status: 'disabled',
        enabled: false,
        bucketsReady: false,
      };
    }

    try {
      // 检查第一个 bucket 是否可访问
      const exists = await this.client.bucketExists(this.buckets.screenshots);
      return {
        status: exists ? 'available' : 'unavailable',
        enabled: true,
        bucketsReady: exists,
      };
    } catch (error) {
      return {
        status: 'error',
        enabled: true,
        bucketsReady: false,
      };
    }
  }

  /**
   * 获取存储统计
   */
  async getStorageStats(): Promise<{
    buckets: Record<string, { name: string; objectCount: number }>;
  }> {
    if (!this.client) {
      return { buckets: {} };
    }

    const stats: Record<string, { name: string; objectCount: number }> = {};

    for (const [key, bucketName] of Object.entries(this.buckets)) {
      try {
        const stream = this.client.listObjects(bucketName, '', true);
        let count = 0;

        await new Promise<void>((resolve, reject) => {
          stream.on('data', () => count++);
          stream.on('end', () => resolve());
          stream.on('error', reject);
        });

        stats[key] = { name: bucketName, objectCount: count };
      } catch (error) {
        stats[key] = { name: bucketName, objectCount: 0 };
      }
    }

    return { buckets: stats };
  }
}

