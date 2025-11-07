import { Injectable, Logger } from '@nestjs/common';

/**
 * 视觉元素信息接口
 */
export interface VisionElement {
  text?: string;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  type?: string;
}

/**
 * MidSceneJS 集成服务
 * 功能 E：视觉解析（FR-06/07）
 *
 * 职责：
 * 1. 调用 MidSceneJS 分析截图
 * 2. 提取视觉元素（文本、边界框、类型）
 * 3. OCR 文本识别
 * 4. 返回结构化数据供定位生成使用
 *
 * 说明：
 * - 当前为 Mock 实现
 * - 后续集成真实 MidSceneJS API
 */
@Injectable()
export class MidSceneService {
  private readonly logger = new Logger(MidSceneService.name);
  private readonly enabled: boolean;

  constructor() {
    this.enabled = process.env.MIDSCENE_ENABLED === 'true';
  }

  /**
   * 分析截图
   *
   * @param screenshotPath - 截图文件路径
   * @returns 视觉元素列表
   */
  async analyzeScreen(screenshotPath: string): Promise<VisionElement[]> {
    if (!this.enabled) {
      this.logger.debug('MidSceneJS is disabled, returning mock data');
      return this.getMockVisionElements();
    }

    try {
      // TODO: 集成真实 MidSceneJS API
      // const result = await midsceneClient.analyzeScreen({
      //   imagePath: screenshotPath,
      //   options: {
      //     extractText: true,
      //     detectElements: true,
      //   },
      // });

      this.logger.log(`Analyzed screen: ${screenshotPath}`);

      // 暂时返回 Mock 数据
      return this.getMockVisionElements();
    } catch (error) {
      const err = error as Error;
      this.logger.error(`MidSceneJS analysis failed: ${err.message}`, err.stack);

      // 失败时返回空数组，不影响主流程
      return [];
    }
  }

  /**
   * OCR 文本识别
   *
   * @param screenshotPath - 截图文件路径
   * @param region - 识别区域（可选）
   * @returns 识别出的文本
   */
  async extractText(
    screenshotPath: string,
    region?: { x: number; y: number; width: number; height: number },
  ): Promise<string[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      // TODO: 集成真实 MidSceneJS OCR
      // const result = await midsceneClient.ocr({
      //   imagePath: screenshotPath,
      //   region,
      // });

      this.logger.log(`Extracted text from: ${screenshotPath}`);

      return [];
    } catch (error) {
      const err = error as Error;
      this.logger.error(`OCR failed: ${err.message}`, err.stack);
      return [];
    }
  }

  /**
   * 元素检测
   *
   * @param screenshotPath - 截图文件路径
   * @returns 检测到的元素边界框
   */
  async detectElements(screenshotPath: string): Promise<VisionElement[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      // TODO: 集成真实 MidSceneJS 元素检测
      // const result = await midsceneClient.detectElements({
      //   imagePath: screenshotPath,
      // });

      this.logger.log(`Detected elements in: ${screenshotPath}`);

      return [];
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Element detection failed: ${err.message}`, err.stack);
      return [];
    }
  }

  /**
   * Mock 视觉元素数据（供测试使用）
   */
  private getMockVisionElements(): VisionElement[] {
    return [
      {
        text: '提交',
        bbox: { x: 100, y: 500, width: 200, height: 60 },
        confidence: 0.95,
        type: 'button',
      },
      {
        text: '取消',
        bbox: { x: 320, y: 500, width: 200, height: 60 },
        confidence: 0.92,
        type: 'button',
      },
      {
        text: '用户名',
        bbox: { x: 50, y: 200, width: 100, height: 40 },
        confidence: 0.88,
        type: 'label',
      },
    ];
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; enabled: boolean }> {
    return {
      status: this.enabled ? 'available' : 'disabled',
      enabled: this.enabled,
    };
  }
}
