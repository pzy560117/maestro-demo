import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LocatorStrategy, LocatorSource } from '@prisma/client';

/**
 * 定位候选接口
 */
export interface LocatorCandidate {
  strategy: LocatorStrategy;
  locatorValue: string;
  score: number;
  source: LocatorSource;
  isPrimary: boolean;
  dynamicFlags?: Record<string, any>;
}

/**
 * 定位生成服务
 * 功能 E：视觉解析与定位融合（FR-06/07）
 * 
 * 职责：
 * 1. 基于 DOM 生成定位候选
 * 2. 基于视觉特征生成定位候选
 * 3. 融合多种策略并计算置信度
 * 4. 标记动态属性
 * 
 * 验收标准：
 * 1. 无 resourceId 的元素提供文本+视觉组合定位
 * 2. 动态属性（时间、UUID）被识别并标记 dynamic_flags
 * 3. 置信度低于 0.5 的定位进入 revisit 队列
 * 4. elements、locator_candidates 表记录完整
 */
@Injectable()
export class LocatorGeneratorService {
  private readonly logger = new Logger(LocatorGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 为元素生成定位候选
   * 
   * @param elementId - 元素 ID
   * @param elementData - 元素数据（从 DOM 提取）
   * @param visionData - 视觉数据（从 MidSceneJS 提取）
   * @param historicalData - 历史定位数据
   * @returns 定位候选列表
   */
  async generateCandidates(
    elementId: string,
    elementData: {
      elementType: string;
      resourceId?: string | null;
      contentDesc?: string | null;
      textValue?: string | null;
      xpath?: string | null;
      bounds: any;
    },
    visionData?: {
      text?: string;
      bbox?: { x: number; y: number; width: number; height: number };
      confidence?: number;
    },
    historicalData?: any[],
  ): Promise<LocatorCandidate[]> {
    const candidates: LocatorCandidate[] = [];

    // 1. 基于 DOM 属性生成定位候选
    candidates.push(...this.generateDomBasedCandidates(elementData));

    // 2. 基于视觉特征生成定位候选（如果有）
    if (visionData) {
      candidates.push(...this.generateVisionBasedCandidates(elementData, visionData));
    }

    // 3. 基于历史数据生成定位候选（如果有）
    if (historicalData && historicalData.length > 0) {
      candidates.push(...this.generateHistoricalCandidates(elementData, historicalData));
    }

    // 4. 按置信度排序
    candidates.sort((a, b) => b.score - a.score);

    // 5. 标记主定位（最高分）
    if (candidates.length > 0) {
      candidates[0].isPrimary = true;
    }

    // 6. 最多返回 5 个候选
    return candidates.slice(0, 5);
  }

  /**
   * 基于 DOM 属性生成定位候选
   */
  private generateDomBasedCandidates(elementData: {
    elementType: string;
    resourceId?: string | null;
    contentDesc?: string | null;
    textValue?: string | null;
    xpath?: string | null;
    bounds: any;
  }): LocatorCandidate[] {
    const candidates: LocatorCandidate[] = [];

    // 策略 1: Resource ID（最优先，如果存在）
    if (elementData.resourceId) {
      const dynamicFlags = this.checkDynamicPattern(elementData.resourceId);
      candidates.push({
        strategy: LocatorStrategy.ID,
        locatorValue: elementData.resourceId,
        score: dynamicFlags.isDynamic ? 0.7 : 0.95,
        source: LocatorSource.DOM,
        isPrimary: false,
        dynamicFlags,
      });
    }

    // 策略 2: 文本内容
    if (elementData.textValue && elementData.textValue.trim()) {
      const dynamicFlags = this.checkDynamicPattern(elementData.textValue);
      candidates.push({
        strategy: LocatorStrategy.TEXT,
        locatorValue: elementData.textValue.trim(),
        score: dynamicFlags.isDynamic ? 0.5 : 0.8,
        source: LocatorSource.DOM,
        isPrimary: false,
        dynamicFlags,
      });
    }

    // 策略 3: Content Description（Accessibility ID）
    if (elementData.contentDesc && elementData.contentDesc.trim()) {
      const dynamicFlags = this.checkDynamicPattern(elementData.contentDesc);
      candidates.push({
        strategy: LocatorStrategy.ACCESSIBILITY_ID,
        locatorValue: elementData.contentDesc.trim(),
        score: dynamicFlags.isDynamic ? 0.6 : 0.85,
        source: LocatorSource.DOM,
        isPrimary: false,
        dynamicFlags,
      });
    }

    // 策略 4: XPath（备用策略）
    if (elementData.xpath) {
      candidates.push({
        strategy: LocatorStrategy.XPATH,
        locatorValue: elementData.xpath,
        score: 0.6, // XPath 不够稳定
        source: LocatorSource.DOM,
        isPrimary: false,
        dynamicFlags: { isXPath: true },
      });
    }

    return candidates;
  }

  /**
   * 基于视觉特征生成定位候选
   */
  private generateVisionBasedCandidates(
    elementData: { textValue?: string | null },
    visionData: {
      text?: string;
      bbox?: { x: number; y: number; width: number; height: number };
      confidence?: number;
    },
  ): LocatorCandidate[] {
    const candidates: LocatorCandidate[] = [];

    // 如果视觉识别出文本且与 DOM 文本一致，提高置信度
    if (visionData.text && visionData.text.trim()) {
      const visionText = visionData.text.trim();
      const isConsistent = elementData.textValue?.includes(visionText) || visionText.includes(elementData.textValue || '');
      
      candidates.push({
        strategy: LocatorStrategy.TEXT,
        locatorValue: visionText,
        score: isConsistent ? 0.9 : 0.75,
        source: LocatorSource.VISION,
        isPrimary: false,
        dynamicFlags: {
          visionConfidence: visionData.confidence || 0,
          isConsistent,
        },
      });
    }

    // 如果有边界框信息，可以生成图像模板定位
    if (visionData.bbox) {
      candidates.push({
        strategy: LocatorStrategy.IMAGE_TEMPLATE,
        locatorValue: JSON.stringify(visionData.bbox),
        score: 0.7,
        source: LocatorSource.VISION,
        isPrimary: false,
        dynamicFlags: {
          bbox: visionData.bbox,
          visionConfidence: visionData.confidence || 0,
        },
      });
    }

    return candidates;
  }

  /**
   * 基于历史数据生成定位候选
   */
  private generateHistoricalCandidates(
    elementData: { elementType: string },
    historicalData: any[],
  ): LocatorCandidate[] {
    const candidates: LocatorCandidate[] = [];

    // 从历史数据中提取成功率高的定位
    for (const history of historicalData.slice(0, 2)) {
      if (history.successRate > 0.8) {
        candidates.push({
          strategy: history.strategy,
          locatorValue: history.locatorValue,
          score: 0.85, // 历史成功定位置信度较高
          source: LocatorSource.HISTORICAL,
          isPrimary: false,
          dynamicFlags: {
            historicalSuccessRate: history.successRate,
          },
        });
      }
    }

    return candidates;
  }

  /**
   * 检查动态模式
   * 识别时间戳、UUID、随机数等动态内容
   */
  private checkDynamicPattern(value: string): Record<string, any> {
    const flags: Record<string, any> = { isDynamic: false };

    // 检查时间戳
    const timestampPattern = /\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2}|\d{13}|\d{10}/;
    if (timestampPattern.test(value)) {
      flags.hasTimestamp = true;
      flags.isDynamic = true;
    }

    // 检查 UUID
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    if (uuidPattern.test(value)) {
      flags.hasUUID = true;
      flags.isDynamic = true;
    }

    // 检查随机数（连续 6 位以上数字）
    const randomPattern = /\d{6,}/;
    if (randomPattern.test(value)) {
      flags.hasPotentialRandom = true;
      flags.isDynamic = true;
    }

    return flags;
  }

  /**
   * 批量保存定位候选到数据库
   */
  async saveCandidates(elementId: string, candidates: LocatorCandidate[]): Promise<void> {
    for (const candidate of candidates) {
      await this.prisma.locatorCandidate.create({
        data: {
          elementId,
          strategy: candidate.strategy,
          locatorValue: candidate.locatorValue,
          score: candidate.score,
          source: candidate.source,
          isPrimary: candidate.isPrimary,
          dynamicFlags: (candidate.dynamicFlags || {}) as any,
          successRate: 0, // 初始成功率为 0
        },
      });
    }

    this.logger.log(`Saved ${candidates.length} locator candidates for element ${elementId}`);
  }
}

