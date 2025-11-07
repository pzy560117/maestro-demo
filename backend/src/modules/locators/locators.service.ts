import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { LocatorGeneratorService } from './services/locator-generator.service';
import { LocatorValidatorService } from './services/locator-validator.service';
import { CreateLocatorCandidateDto, GenerateLocatorsDto } from './dto/create-locator.dto';
import { LocatorCandidateResponseDto } from './dto/locator-response.dto';
import { Element, ValidationType } from '@prisma/client';
import { VisionSnapshot } from '../common/types/vision.types';

type ElementWithScreen = Element & {
  screen?: {
    metadata: any;
    width: number;
    height: number;
  };
};

/**
 * 定位管理服务
 * 整合定位生成和验证功能
 */
@Injectable()
export class LocatorsService {
  private readonly logger = new Logger(LocatorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly generatorService: LocatorGeneratorService,
    private readonly validatorService: LocatorValidatorService,
  ) {}

  /**
   * 手动创建定位候选
   */
  async create(createLocatorDto: CreateLocatorCandidateDto): Promise<LocatorCandidateResponseDto> {
    const { elementId } = createLocatorDto;

    // 检查元素是否存在
    const elementRecord = await this.prisma.element.findUnique({
      where: { id: elementId },
      include: {
        screen: {
          select: {
            metadata: true,
            width: true,
            height: true,
          },
        },
      },
    });

    if (!elementRecord) {
      throw BusinessException.notFound('元素', elementId);
    }

    const element = elementRecord as ElementWithScreen;

    // 创建定位候选
    const candidate = await this.prisma.locatorCandidate.create({
      data: {
        elementId: createLocatorDto.elementId,
        strategy: createLocatorDto.strategy,
        locatorValue: createLocatorDto.locatorValue,
        score: createLocatorDto.score,
        source: createLocatorDto.source,
        isPrimary: createLocatorDto.isPrimary || false,
        dynamicFlags: (createLocatorDto.dynamicFlags || {}) as any,
        successRate: 0,
      },
    });

    this.logger.log(`Locator candidate created: ${candidate.id}`);

    return new LocatorCandidateResponseDto(candidate);
  }

  /**
   * 自动生成定位候选
   * 集成 DOM 和视觉数据
   */
  async generateLocators(generateDto: GenerateLocatorsDto): Promise<LocatorCandidateResponseDto[]> {
    const { elementId, useHistorical = true } = generateDto;

    // 查询元素
    const elementRecord = await this.prisma.element.findUnique({
      where: { id: elementId },
      include: {
        screen: {
          select: {
            metadata: true,
            width: true,
            height: true,
          },
        },
      },
    });

    if (!elementRecord) {
      throw BusinessException.notFound('元素', elementId);
    }

    const element = elementRecord as ElementWithScreen;

    // 准备元素数据
    const elementData = {
      elementType: element.elementType,
      resourceId: element.resourceId,
      contentDesc: element.contentDesc,
      textValue: element.textValue,
      xpath: element.xpath,
      bounds: element.bounds,
    };

    const visionSummary = this.extractVisionSummary(element.screen?.metadata);
    const visionMatch = visionSummary ? this.matchVisionElement(element, visionSummary) : undefined;

    // 查询历史数据
    let historicalData;
    if (useHistorical) {
      const historical = await this.prisma.locatorCandidate.findMany({
        where: {
          elementId,
          successRate: { gte: 80 },
        },
        orderBy: { successRate: 'desc' },
        take: 3,
      });

      historicalData = historical.map((h) => ({
        strategy: h.strategy,
        locatorValue: h.locatorValue,
        successRate: Number(h.successRate),
      }));
    }

    // 生成候选
    const candidates = await this.generatorService.generateCandidates(
      elementId,
      elementData,
      visionMatch,
      historicalData,
    );

    // 保存到数据库
    await this.generatorService.saveCandidates(elementId, candidates);

    // 查询并返回
    const savedCandidates = await this.prisma.locatorCandidate.findMany({
      where: { elementId },
      orderBy: [{ isPrimary: 'desc' }, { score: 'desc' }],
      take: 5,
    });

    return savedCandidates.map((c) => new LocatorCandidateResponseDto(c));
  }

  /**
   * 查询元素的所有定位候选
   */
  async findByElement(elementId: string): Promise<LocatorCandidateResponseDto[]> {
    const candidates = await this.prisma.locatorCandidate.findMany({
      where: { elementId },
      orderBy: [{ isPrimary: 'desc' }, { score: 'desc' }],
    });

    return candidates.map((c) => new LocatorCandidateResponseDto(c));
  }

  /**
   * 查询单个定位候选
   */
  async findOne(id: string): Promise<LocatorCandidateResponseDto> {
    const candidate = await this.prisma.locatorCandidate.findUnique({
      where: { id },
    });

    if (!candidate) {
      throw BusinessException.notFound('定位候选', id);
    }

    return new LocatorCandidateResponseDto(candidate);
  }

  /**
   * 删除定位候选
   */
  async remove(id: string): Promise<void> {
    const candidate = await this.prisma.locatorCandidate.findUnique({
      where: { id },
    });

    if (!candidate) {
      throw BusinessException.notFound('定位候选', id);
    }

    await this.prisma.locatorCandidate.delete({
      where: { id },
    });

    this.logger.log(`Locator candidate deleted: ${id}`);
  }

  /**
   * 查询验证历史
   */
  async getValidationHistory(elementId: string): Promise<any[]> {
    return await this.validatorService.getValidationHistory(elementId);
  }

  private extractVisionSummary(metadata: any): VisionSnapshot | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const container = metadata as Record<string, any>;
    const vision = container.vision ?? container;

    if (!vision || typeof vision !== 'object') {
      return undefined;
    }

    const raw = vision as Record<string, any>;
    if (!Array.isArray(raw.elements)) {
      return undefined;
    }

    const provider =
      typeof raw.provider === 'string' && raw.provider.trim().length > 0
        ? raw.provider
        : 'dashscope';
    const analyzedAt =
      typeof raw.analyzedAt === 'string' && raw.analyzedAt.trim().length > 0
        ? raw.analyzedAt
        : new Date().toISOString();
    const totalElements =
      typeof raw.totalElements === 'number' ? raw.totalElements : raw.elements.length;

    return {
      provider,
      analyzedAt,
      totalElements,
      elements: raw.elements as VisionSnapshot['elements'],
    };
  }

  private matchVisionElement(
    element: any,
    visionSummary: VisionSnapshot,
  ):
    | {
        text?: string;
        bbox?: { x: number; y: number; width: number; height: number };
        confidence?: number;
        overlapScore?: number;
        provider?: string;
        textMatched?: boolean;
      }
    | undefined {
    const domRect = this.normalizeBounds(element?.bounds);
    if (!domRect) {
      return undefined;
    }

    let bestMatch:
      | {
          element: any;
          rect: { x: number; y: number; width: number; height: number };
          iou: number;
          textMatched: boolean;
          score: number;
        }
      | undefined;

    const domText = this.getElementPrimaryText(element);

    for (const candidate of visionSummary.elements) {
      const visionRect = this.normalizeBounds(candidate?.bbox);
      if (!visionRect) {
        continue;
      }

      const iou = this.computeIoU(domRect, visionRect);
      if (iou <= 0) {
        continue;
      }

      const textMatched = this.isTextMatched(domText, candidate?.text);
      const confidence = typeof candidate?.confidence === 'number' ? candidate.confidence : 0;
      const combinedScore = iou * 0.6 + (textMatched ? 0.3 : 0) + confidence * 0.1;

      if (!bestMatch || combinedScore > bestMatch.score) {
        bestMatch = {
          element: candidate,
          rect: visionRect,
          iou,
          textMatched,
          score: combinedScore,
        };
      }
    }

    if (!bestMatch) {
      return undefined;
    }

    if (bestMatch.iou < 0.15 && !bestMatch.textMatched) {
      return undefined;
    }

    return {
      text: bestMatch.element?.text,
      bbox: bestMatch.rect,
      confidence:
        typeof bestMatch.element?.confidence === 'number'
          ? bestMatch.element.confidence
          : undefined,
      overlapScore: Number(bestMatch.iou.toFixed(3)),
      provider: visionSummary.provider,
      textMatched: bestMatch.textMatched,
    };
  }

  private getElementPrimaryText(element: any): string {
    const textCandidates: Array<string | undefined | null> = [
      element?.textValue,
      element?.contentDesc,
      element?.accessibilityLabel,
    ];

    for (const value of textCandidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim().toLowerCase();
      }
    }

    return '';
  }

  private isTextMatched(domText: string, visionText?: string): boolean {
    if (!domText || !visionText) {
      return false;
    }

    const normalizedVision = visionText.trim().toLowerCase();
    if (!normalizedVision) {
      return false;
    }

    return domText.includes(normalizedVision) || normalizedVision.includes(domText);
  }

  private normalizeBounds(
    bounds: any,
  ): { x: number; y: number; width: number; height: number } | undefined {
    if (!bounds) {
      return undefined;
    }

    if (typeof bounds === 'string') {
      const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (match) {
        const left = Number(match[1]);
        const top = Number(match[2]);
        const right = Number(match[3]);
        const bottom = Number(match[4]);
        return {
          x: left,
          y: top,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top),
        };
      }
    }

    if (typeof bounds === 'object') {
      const obj = bounds as Record<string, any>;
      const hasXY = this.isFiniteNumber(obj.x) && this.isFiniteNumber(obj.y);
      const hasSize = this.isFiniteNumber(obj.width) && this.isFiniteNumber(obj.height);
      const hasEdges =
        this.isFiniteNumber(obj.left) &&
        this.isFiniteNumber(obj.top) &&
        this.isFiniteNumber(obj.right) &&
        this.isFiniteNumber(obj.bottom);

      if (hasXY && hasSize) {
        return {
          x: Number(obj.x),
          y: Number(obj.y),
          width: Math.max(0, Number(obj.width)),
          height: Math.max(0, Number(obj.height)),
        };
      }

      if (hasEdges) {
        const left = Number(obj.left);
        const top = Number(obj.top);
        const right = Number(obj.right);
        const bottom = Number(obj.bottom);
        return {
          x: left,
          y: top,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top),
        };
      }
    }

    return undefined;
  }

  private computeIoU(
    rectA: { x: number; y: number; width: number; height: number },
    rectB: { x: number; y: number; width: number; height: number },
  ): number {
    const xA = Math.max(rectA.x, rectB.x);
    const yA = Math.max(rectA.y, rectB.y);
    const xB = Math.min(rectA.x + rectA.width, rectB.x + rectB.width);
    const yB = Math.min(rectA.y + rectA.height, rectB.y + rectB.height);

    const intersectionWidth = xB - xA;
    const intersectionHeight = yB - yA;

    if (intersectionWidth <= 0 || intersectionHeight <= 0) {
      return 0;
    }

    const intersectionArea = intersectionWidth * intersectionHeight;
    const unionArea = rectA.width * rectA.height + rectB.width * rectB.height - intersectionArea;

    if (unionArea <= 0) {
      return 0;
    }

    return intersectionArea / unionArea;
  }

  private isFiniteNumber(value: any): boolean {
    return typeof value === 'number' && Number.isFinite(value);
  }
}
