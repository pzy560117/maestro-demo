import { ApiProperty } from '@nestjs/swagger';
import { LocatorCandidate, LocatorStrategy, LocatorSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 定位候选响应 DTO
 */
export class LocatorCandidateResponseDto {
  @ApiProperty({ description: '定位候选 ID' })
  id: string;

  @ApiProperty({ description: '元素 ID' })
  elementId: string;

  @ApiProperty({ description: '定位策略' })
  strategy: LocatorStrategy;

  @ApiProperty({ description: '定位值' })
  locatorValue: string;

  @ApiProperty({ description: '置信度分数' })
  score: number;

  @ApiProperty({ description: '来源' })
  source: LocatorSource;

  @ApiProperty({ description: '是否为主定位' })
  isPrimary: boolean;

  @ApiProperty({ description: '动态标记', required: false })
  dynamicFlags?: any;

  @ApiProperty({ description: '成功率' })
  successRate: number;

  @ApiProperty({ description: '最后验证时间', required: false })
  lastVerifiedAt?: Date | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  constructor(candidate: LocatorCandidate) {
    this.id = candidate.id;
    this.elementId = candidate.elementId;
    this.strategy = candidate.strategy;
    this.locatorValue = candidate.locatorValue;
    this.score = this.decimalToNumber(candidate.score);
    this.source = candidate.source;
    this.isPrimary = candidate.isPrimary;
    this.dynamicFlags = candidate.dynamicFlags;
    this.successRate = this.decimalToNumber(candidate.successRate);
    this.lastVerifiedAt = candidate.lastVerifiedAt;
    this.createdAt = candidate.createdAt;
    this.updatedAt = candidate.updatedAt;
  }

  private decimalToNumber(value: Decimal): number {
    return typeof value === 'object' ? parseFloat(value.toString()) : Number(value);
  }
}
