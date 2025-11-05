import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';

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
 * MidSceneJS 真实集成服务
 * 
 * 职责：
 * 1. 调用 MidSceneJS API 分析截图
 * 2. OCR 文本识别
 * 3. UI 元素检测
 * 4. 返回结构化视觉数据
 * 
 * 说明：
 * - MidSceneJS 是一个开源的 UI 自动化库
 * - 支持视觉 AI 驱动的元素定位
 * - 需要配置 AI 模型（如 OpenAI、本地模型等）
 */
@Injectable()
export class MidSceneRealService {
  private readonly logger = new Logger(MidSceneRealService.name);
  private readonly enabled: boolean;
  private readonly apiEndpoint: string;
  private readonly apiKey: string;

  constructor() {
    this.enabled = process.env.MIDSCENE_ENABLED === 'true';
    this.apiEndpoint = process.env.MIDSCENE_API_ENDPOINT || 'http://localhost:8080';
    this.apiKey = process.env.MIDSCENE_API_KEY || '';
  }

  /**
   * 分析截图
   * 
   * @param screenshotPath - 截图文件路径或 Buffer
   * @returns 视觉元素列表
   */
  async analyzeScreen(screenshotPath: string | Buffer): Promise<VisionElement[]> {
    if (!this.enabled) {
      this.logger.debug('MidSceneJS is disabled, skipping analysis');
      return [];
    }

    try {
      let imageBuffer: Buffer;

      if (typeof screenshotPath === 'string') {
        imageBuffer = await fs.readFile(screenshotPath);
      } else {
        imageBuffer = screenshotPath;
      }

      // 调用 MidSceneJS API（使用类似 GPT-4V 的方式）
      const response = await this.callVisionAPI(imageBuffer, {
        task: 'detect_elements',
        includeText: true,
        includeBounds: true,
      });

      const elements = this.parseVisionResponse(response);

      this.logger.log(`Analyzed screen, found ${elements.length} elements`);

      return elements;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`MidSceneJS analysis failed: ${err.message}`, err.stack);
      return [];
    }
  }

  /**
   * OCR 文本识别
   * 
   * @param screenshotPath - 截图文件路径或 Buffer
   * @param region - 识别区域（可选）
   * @returns 识别出的文本
   */
  async extractText(
    screenshotPath: string | Buffer,
    region?: { x: number; y: number; width: number; height: number },
  ): Promise<string[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      let imageBuffer: Buffer;

      if (typeof screenshotPath === 'string') {
        imageBuffer = await fs.readFile(screenshotPath);
      } else {
        imageBuffer = screenshotPath;
      }

      // 如果指定了区域，裁剪图片
      if (region) {
        // TODO: 使用 sharp 库裁剪图片
        this.logger.debug('Region-based OCR not implemented yet');
      }

      const response = await this.callVisionAPI(imageBuffer, {
        task: 'ocr',
        language: 'zh-CN,en-US',
      });

      const texts = this.parseOCRResponse(response);

      this.logger.log(`Extracted ${texts.length} text elements`);

      return texts;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`OCR failed: ${err.message}`, err.stack);
      return [];
    }
  }

  /**
   * 元素检测
   * 
   * @param screenshotPath - 截图文件路径或 Buffer
   * @returns 检测到的元素边界框
   */
  async detectElements(screenshotPath: string | Buffer): Promise<VisionElement[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      let imageBuffer: Buffer;

      if (typeof screenshotPath === 'string') {
        imageBuffer = await fs.readFile(screenshotPath);
      } else {
        imageBuffer = screenshotPath;
      }

      const response = await this.callVisionAPI(imageBuffer, {
        task: 'detect_elements',
        types: ['button', 'input', 'text', 'image', 'icon'],
      });

      const elements = this.parseVisionResponse(response);

      this.logger.log(`Detected ${elements.length} UI elements`);

      return elements;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Element detection failed: ${err.message}`, err.stack);
      return [];
    }
  }

  /**
   * 调用视觉 API
   * 
   * 说明：这里使用通用的视觉 AI API 接口
   * 可以对接 OpenAI GPT-4V、阿里云视觉、百度 OCR 等
   */
  private async callVisionAPI(imageBuffer: Buffer, options: any): Promise<any> {
    try {
      const base64Image = imageBuffer.toString('base64');

      const response = await fetch(`${this.apiEndpoint}/v1/vision/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          image: base64Image,
          options,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Vision API call failed: ${err.message}`);
      throw error;
    }
  }

  /**
   * 解析视觉响应
   */
  private parseVisionResponse(response: any): VisionElement[] {
    if (!response || !response.elements) {
      return [];
    }

    return response.elements.map((el: any) => ({
      text: el.text || undefined,
      bbox: el.bbox
        ? {
            x: el.bbox.x,
            y: el.bbox.y,
            width: el.bbox.width,
            height: el.bbox.height,
          }
        : undefined,
      confidence: el.confidence || 0.5,
      type: el.type || 'unknown',
    }));
  }

  /**
   * 解析 OCR 响应
   */
  private parseOCRResponse(response: any): string[] {
    if (!response || !response.texts) {
      return [];
    }

    return response.texts.map((t: any) => t.text || t.content || String(t));
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; enabled: boolean; endpoint: string }> {
    if (!this.enabled) {
      return {
        status: 'disabled',
        enabled: false,
        endpoint: this.apiEndpoint,
      };
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return {
        status: response.ok ? 'available' : 'unavailable',
        enabled: true,
        endpoint: this.apiEndpoint,
      };
    } catch (error) {
      return {
        status: 'unavailable',
        enabled: true,
        endpoint: this.apiEndpoint,
      };
    }
  }
}

