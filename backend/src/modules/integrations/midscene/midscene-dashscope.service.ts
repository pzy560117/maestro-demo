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
  private readonly maxConcurrent: number;
  private readonly timeoutMs: number;
  private readonly warnLatencyMs: number;
  private readonly latencySampleSize = 25;
  private activeRequests = 0;
  private waitQueue: Array<() => void> = [];
  private latencySamples: number[] = [];

  constructor() {
    this.enabled = process.env.MIDSCENE_ENABLED === 'true';
    this.apiEndpoint = process.env.MIDSCENE_API_ENDPOINT || process.env.LLM_API_ENDPOINT || '';
    this.apiKey = (process.env.MIDSCENE_API_KEY || process.env.LLM_API_KEY || '').trim();
    this.maxConcurrent = Math.max(1, Number(process.env.MIDSCENE_MAX_CONCURRENCY || 3));
    this.timeoutMs = Math.max(1000, Number(process.env.MIDSCENE_TIMEOUT_MS || 8000));
    this.warnLatencyMs = Math.max(500, Number(process.env.MIDSCENE_WARN_LATENCY_MS || 2000));
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
      const payload = this.buildVisionPayload(screenshotBuffer);
      const data = await this.callDashScope(payload, 'vision-analyze');
      const elements = this.parseQwenVLResponse(data);

      this.logger.log(
        `DashScope analyzed screen, found ${elements.length} elements (active: ${this.activeRequests})`,
      );

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
      const payload = this.buildOcrPayload(screenshotBuffer);
      const data = await this.callDashScope(payload, 'vision-ocr');
      const texts = this.parseOCRResponse(data);

      this.logger.log(
        `DashScope OCR extracted ${texts.length} entries (active: ${this.activeRequests})`,
      );

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
  async healthCheck(): Promise<{
    status: string;
    enabled: boolean;
    endpoint: string;
    metrics?: any;
  }> {
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
        metrics: this.getMetricsSnapshot(),
      };
    }

    return {
      status: 'available',
      enabled: true,
      endpoint: this.apiEndpoint,
      metrics: this.getMetricsSnapshot(),
    };
  }

  private buildVisionPayload(screenshotBuffer: Buffer): any {
    const base64Image = screenshotBuffer.toString('base64');

    return {
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

请以 JSON 数组格式返回。`,
            },
          ],
        },
      ],
    };
  }

  private buildOcrPayload(screenshotBuffer: Buffer): any {
    const base64Image = screenshotBuffer.toString('base64');

    return {
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
    };
  }

  private async callDashScope(payload: any, operation: string): Promise<any> {
    if (!this.enabled) {
      throw new Error('DashScope integration is disabled');
    }

    if (!this.apiKey) {
      throw new Error('DashScope API key not configured');
    }

    if (!this.apiEndpoint) {
      throw new Error('DashScope API endpoint not configured');
    }

    await this.acquireSlot();

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);
    const start = Date.now();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-DashScope-Token': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `DashScope API error (${operation}): ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      return await response.json();
    } catch (error) {
      const err = error as any;
      if (err?.name === 'AbortError') {
        throw new Error(`DashScope request timed out after ${this.timeoutMs}ms (${operation})`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutHandle);
      const duration = Date.now() - start;
      this.recordLatency(duration);

      if (duration > this.warnLatencyMs) {
        this.logger.warn(
          `DashScope ${operation} latency ${duration}ms exceeded threshold ${this.warnLatencyMs}ms`,
        );
      }

      this.releaseSlot();
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.activeRequests < this.maxConcurrent) {
      this.activeRequests += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });

    this.activeRequests += 1;
  }

  private releaseSlot(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    const next = this.waitQueue.shift();
    if (next) {
      next();
    }
  }

  private recordLatency(duration: number): void {
    if (!Number.isFinite(duration)) {
      return;
    }

    this.latencySamples.push(duration);
    if (this.latencySamples.length > this.latencySampleSize) {
      this.latencySamples.shift();
    }
  }

  private getMetricsSnapshot() {
    const samples = [...this.latencySamples];
    const avg = samples.length
      ? samples.reduce((sum, value) => sum + value, 0) / samples.length
      : 0;

    const sorted = samples.slice().sort((a, b) => a - b);
    const p95Index = sorted.length
      ? Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
      : 0;
    const p95 = sorted.length ? sorted[p95Index] : 0;

    return {
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrent,
      averageLatencyMs: Number(avg.toFixed(2)),
      p95LatencyMs: Math.round(p95),
      sampleSize: samples.length,
    };
  }
}
