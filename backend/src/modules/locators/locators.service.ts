import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { LocatorGeneratorService } from './services/locator-generator.service';
import { LocatorValidatorService } from './services/locator-validator.service';
import { CreateLocatorCandidateDto, GenerateLocatorsDto } from './dto/create-locator.dto';
import { LocatorCandidateResponseDto } from './dto/locator-response.dto';
import { ValidationType } from '@prisma/client';

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
    const element = await this.prisma.element.findUnique({
      where: { id: elementId },
    });

    if (!element) {
      throw BusinessException.notFound('元素', elementId);
    }

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
    const element = await this.prisma.element.findUnique({
      where: { id: elementId },
    });

    if (!element) {
      throw BusinessException.notFound('元素', elementId);
    }

    // 准备元素数据
    const elementData = {
      elementType: element.elementType,
      resourceId: element.resourceId,
      contentDesc: element.contentDesc,
      textValue: element.textValue,
      xpath: element.xpath,
      bounds: element.bounds,
    };

    // TODO: 从 MidSceneJS 获取视觉数据
    const visionData = undefined;

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
      visionData,
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
}

