import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppiumService } from '../../integrations/appium/appium.service';
import { MidSceneDashScopeService } from '../../integrations/midscene/midscene-dashscope.service';
import { VisionElement as MidSceneVisionElement } from '../../integrations/midscene/midscene-real.service';
import { VisionSnapshot, VisionElementSummary } from '../../common/types/vision.types';
import { createHash } from 'crypto';
import * as sharp from 'sharp';
import { ScreenStorageService } from '../../screens/services/screen-storage.service';

/**
 * 截图捕获服务
 * 实现 Iteration 1 功能：截图和 DOM 获取
 *
 * 职责：
 * 1. 获取设备截图
 * 2. 获取 DOM 树
 * 3. 生成界面签名
 * 4. 保存截图和 DOM 到存储
 */
@Injectable()
export class ScreenCaptureService {
  private readonly logger = new Logger(ScreenCaptureService.name);
  private storageInitialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly appium: AppiumService,
    private readonly midsceneDashScope: MidSceneDashScopeService,
    private readonly storageService: ScreenStorageService,
  ) {}

  /**
   * 捕获当前界面
   *
   * @param sessionId - Appium 会话 ID
   * @param taskRunId - 任务运行 ID
   * @param appVersionId - 应用版本 ID
   * @returns 界面记录
   */
  async captureScreen(
    sessionId: string,
    taskRunId: string,
    appVersionId: string,
  ): Promise<{
    screenId: string;
    signature: string;
    screenshotPath: string;
    screenshotPublicUrl?: string;
    domPath: string;
    domJson?: any;
    visionSummary?: VisionSnapshot;
  }> {
    try {
      await this.ensureStorageReady();
      // 1. 获取截图
      const screenshot = await this.appium.takeScreenshot(sessionId);

      // 1.1 视觉摘要（优先 DashScope）
      const visionSummary = await this.generateVisionSummary(screenshot);

      // 2. 获取 DOM
      const domData = await this.appium.getPageSource(sessionId);

      // 3. 生成签名
      const signature = this.generateSignature(screenshot, domData);

      // 4. 检查界面是否已存在
      const existingScreen = await this.prisma.screen.findUnique({
        where: {
          appVersionId_signature: {
            appVersionId,
            signature,
          },
        },
      });

      if (existingScreen) {
        this.logger.debug(`Screen already exists: ${signature}`);
        return {
          screenId: existingScreen.id,
          signature: existingScreen.signature,
          screenshotPath: this.storageService.resolveAbsolutePath(existingScreen.screenshotPath),
          screenshotPublicUrl: existingScreen.screenshotPublicUrl || undefined,
          domPath: this.storageService.resolveAbsolutePath(existingScreen.domPath),
          domJson: domData,
          visionSummary: visionSummary,
        };
      }

      // 5. 保存文件
      const screenshotAsset = await this.storageService.saveScreenshot(screenshot, appVersionId);

      const thumbnailBuffer = await sharp(screenshot)
        .resize(300, null, { fit: 'inside' })
        .toFormat('webp')
        .toBuffer();
      const thumbnailAsset = await this.storageService.saveThumbnail(thumbnailBuffer, appVersionId);

      const domAsset = await this.storageService.saveDom(domData, appVersionId);

      // 6. 获取图片尺寸
      const metadata = await sharp(screenshot).metadata();

      // 7. 创建界面记录
      const screen = await this.prisma.screen.create({
        data: {
          appVersionId,
          signature,
          domHash: this.hashString(JSON.stringify(domData)),
          primaryText: this.extractPrimaryText(domData),
          screenshotPath: screenshotAsset.relativePath,
          screenshotPublicUrl: screenshotAsset.publicUrl ?? null,
          screenshotThumbPath: thumbnailAsset.relativePath,
          domPath: domAsset.relativePath,
          orientation: (metadata.width || 0) > (metadata.height || 0) ? 'LANDSCAPE' : 'PORTRAIT',
          width: metadata.width || 0,
          height: metadata.height || 0,
          capturedAt: new Date(),
          sourceTaskRunId: taskRunId,
          metadata: visionSummary ? ({ vision: visionSummary } as any) : undefined,
        },
      });

      this.logger.log(`Screen captured: ${screen.id} (${signature})`);

      return {
        screenId: screen.id,
        signature: screen.signature,
        screenshotPath: screenshotAsset.absolutePath,
        screenshotPublicUrl: screenshotAsset.publicUrl ?? undefined,
        domPath: domAsset.absolutePath,
        domJson: domData,
        visionSummary: visionSummary,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to capture screen: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 确保存储服务已完成初始化
   */
  private async ensureStorageReady(): Promise<void> {
    if (this.storageInitialized) {
      return;
    }

    await this.storageService.init();
    this.storageInitialized = true;
  }

  /**
   * 生成视觉摘要
   */
  private async generateVisionSummary(screenshot: Buffer): Promise<VisionSnapshot | undefined> {
    try {
      const elements = await this.midsceneDashScope.analyzeScreen(screenshot);

      if (!elements || elements.length === 0) {
        return undefined;
      }

      const normalized = this.normalizeVisionElements(elements);

      if (normalized.length === 0) {
        return undefined;
      }

      return {
        provider: 'dashscope',
        analyzedAt: new Date().toISOString(),
        totalElements: elements.length,
        elements: normalized,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Vision summary skipped: ${err.message}`);
      return undefined;
    }
  }

  /**
   * 归一化视觉元素
   */
  private normalizeVisionElements(elements: MidSceneVisionElement[]): VisionElementSummary[] {
    const maxElements = 30;

    const sorted = [...elements].sort((a, b) => {
      const scoreA = typeof a.confidence === 'number' ? a.confidence : 0;
      const scoreB = typeof b.confidence === 'number' ? b.confidence : 0;
      return scoreB - scoreA;
    });

    return sorted.slice(0, maxElements).map((el) => {
      const bbox = el.bbox
        ? {
            x: Number(el.bbox.x ?? 0),
            y: Number(el.bbox.y ?? 0),
            width: Number(el.bbox.width ?? 0),
            height: Number(el.bbox.height ?? 0),
          }
        : undefined;

      return {
        type: el.type || undefined,
        text: this.normalizeVisionText(el.text),
        bbox,
        confidence:
          typeof el.confidence === 'number' ? Number(el.confidence.toFixed(3)) : undefined,
      };
    });
  }

  /**
   * 规范化视觉文本
   */
  private normalizeVisionText(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const maxLength = 80;
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
  }

  /**
   * 生成界面签名
   * 基于截图和 DOM 的 hash
   */
  private generateSignature(screenshot: Buffer, domData: any): string {
    const screenshotHash = this.hashBuffer(screenshot);
    const domHash = this.hashString(JSON.stringify(domData));

    // 组合 hash 生成签名（取前16位）
    const combined = `${screenshotHash}:${domHash}`;
    return this.hashString(combined).substring(0, 16);
  }

  /**
   * 计算 Buffer 的 hash
   */
  private hashBuffer(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * 计算字符串的 hash
   */
  private hashString(str: string): string {
    return createHash('sha256').update(str, 'utf8').digest('hex');
  }

  /**
   * 从 DOM 中提取主要文本
   * 简化版：提取前50个字符
   */
  private extractPrimaryText(domData: any): string | null {
    try {
      // 这里应该实现更智能的文本提取
      // 当前简化版：从原始 XML 中提取
      if (domData.raw) {
        const textMatch = domData.raw.match(/text="([^"]+)"/);
        if (textMatch && textMatch[1]) {
          return textMatch[1].substring(0, 50);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}
