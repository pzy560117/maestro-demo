import { Injectable, Logger } from '@nestjs/common';
import { VisionElement } from './midscene-real.service';

/**
 * MidSceneJS - 阿里云 DashScope 视觉 API 适配器
 * 
 * 使用阿里云的 Qwen-VL-Max 模型进行视觉分析
 */
@Injectable()
export class MidSceneDashScopeService {
  private readonly logger = new Logger(MidSceneDashScopeService.name);
  private readonly enabled: boolean;
  private readonly apiEndpoint: string;
  private readonly apiKey: string;

  constructor() {
    this.enabled = process.env.MIDSCENE_ENABLED === 'true';
    this.apiEndpoint = process.env.LLM_API_ENDPOINT || '';
    this.apiKey = process.env.LLM_API_KEY || '';
  }

  /**
   * 分析截图 - 使用阿里云视觉 API
   */
  async analyzeScreen(screenshotBuffer: Buffer): Promise<VisionElement[]> {
    if (!this.enabled) {
      this.logger.debug('MidSceneJS (DashScope) is disabled');
      return [];
    }

    try {
      const base64Image = screenshotBuffer.toString('base64');

      // 调用阿里云 Qwen-VL-Max API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-vl-max',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`,
                  },
                },
                {
                  type: 'text',
                  text: `请分析这个移动应用界面截图，识别所有可交互的 UI 元素。

对每个元素，请提供：
1. 元素类型（button/input/text/image/icon）
2. 文本内容（如果有）
3. 元素边界（x, y, width, height，相对于截图左上角的像素坐标）
4. 置信度（0-1）

请以 JSON 数组格式返回，格式如下：
[
  {
    "type": "button",
    "text": "提交",
    "bbox": {"x": 100, "y": 200, "width": 300, "height": 60},
    "confidence": 0.95
  }
]`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`DashScope API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // 解析 Qwen-VL-Max 的响应
      const elements = this.parseQwenVLResponse(data);

      this.logger.log(`DashScope analyzed screen, found ${elements.length} elements`);

      return elements;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`DashScope vision API failed: ${err.message}`, err.stack);
      return [];
    }
  }

  /**
   * OCR 文本识别
   */
  async extractText(screenshotBuffer: Buffer): Promise<string[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      const base64Image = screenshotBuffer.toString('base64');

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-vl-max',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`,
                  },
                },
                {
                  type: 'text',
                  text: '请识别并提取这个移动应用界面中的所有可见文字。以 JSON 数组格式返回，每个元素是一个文本字符串。',
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`DashScope API error: ${response.statusText}`);
      }

      const data = await response.json();
      const texts = this.parseOCRResponse(data);

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
   */
  async detectElements(screenshotBuffer: Buffer): Promise<VisionElement[]> {
    // 复用 analyzeScreen
    return await this.analyzeScreen(screenshotBuffer);
  }

  /**
   * 解析 Qwen-VL-Max 响应
   */
  private parseQwenVLResponse(data: any): VisionElement[] {
    try {
      // Qwen-VL-Max 返回格式
      const content = data.choices?.[0]?.message?.content || '';
      
      // 尝试从响应中提取 JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn('No JSON array found in Qwen-VL response');
        return [];
      }

      const elements = JSON.parse(jsonMatch[0]);

      return elements.map((el: any) => ({
        text: el.text || undefined,
        bbox: el.bbox
          ? {
              x: el.bbox.x || 0,
              y: el.bbox.y || 0,
              width: el.bbox.width || 0,
              height: el.bbox.height || 0,
            }
          : undefined,
        confidence: el.confidence || 0.5,
        type: el.type || 'unknown',
      }));
    } catch (error) {
      this.logger.error(`Failed to parse Qwen-VL response: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * 解析 OCR 响应
   */
  private parseOCRResponse(data: any): string[] {
    try {
      const content = data.choices?.[0]?.message?.content || '';
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // 如果没有 JSON，尝试按行分割
        return content.split('\n').filter((line: string) => line.trim().length > 0);
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to parse OCR response: ${(error as Error).message}`);
      return [];
    }
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

    // 检查 API Key 是否配置
    if (!this.apiKey || this.apiKey === 'sk-test-key') {
      return {
        status: 'not_configured',
        enabled: true,
        endpoint: this.apiEndpoint,
      };
    }

    return {
      status: 'available',
      enabled: true,
      endpoint: this.apiEndpoint,
    };
  }
}

