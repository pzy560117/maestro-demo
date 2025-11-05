import { Injectable, Logger } from '@nestjs/common';
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
@Injectable()
export class ScreenStorageService {
  private readonly logger = new Logger(ScreenStorageService.name);
  private readonly baseDir: string;

  constructor() {
    // 存储根目录
    this.baseDir = process.env.STORAGE_BASE_DIR || path.join(process.cwd(), 'storage');
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
  async saveScreenshot(buffer: Buffer, appVersionId: string): Promise<string> {
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const yearMonth = this.getYearMonth();
    const fileName = `screen_${hash}.webp`;
    const relativePath = path.join('screenshots', yearMonth, fileName);
    const fullPath = path.join(this.baseDir, relativePath);

    await this.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, buffer);

    this.logger.debug(`Screenshot saved: ${relativePath}`);

    return relativePath;
  }

  /**
   * 保存缩略图
   * 
   * @param buffer - 缩略图文件内容
   * @param appVersionId - 应用版本 ID
   * @returns 相对路径
   */
  async saveThumbnail(buffer: Buffer, appVersionId: string): Promise<string> {
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const yearMonth = this.getYearMonth();
    const fileName = `thumb_${hash}.webp`;
    const relativePath = path.join('thumbnails', yearMonth, fileName);
    const fullPath = path.join(this.baseDir, relativePath);

    await this.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, buffer);

    this.logger.debug(`Thumbnail saved: ${relativePath}`);

    return relativePath;
  }

  /**
   * 保存 DOM JSON
   * 
   * @param domData - DOM 数据对象
   * @param appVersionId - 应用版本 ID
   * @returns 相对路径
   */
  async saveDom(domData: any, appVersionId: string): Promise<string> {
    const jsonString = JSON.stringify(domData, null, 2);
    const hash = crypto.createHash('md5').update(jsonString).digest('hex');
    const yearMonth = this.getYearMonth();
    const fileName = `dom_${hash}.json`;
    const relativePath = path.join('dom', yearMonth, fileName);
    const fullPath = path.join(this.baseDir, relativePath);

    await this.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, jsonString, 'utf-8');

    this.logger.debug(`DOM saved: ${relativePath}`);

    return relativePath;
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
   * 获取年月目录名（用于分组存储）
   */
  private getYearMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
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

