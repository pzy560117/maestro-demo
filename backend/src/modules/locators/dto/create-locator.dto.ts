import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { LocatorStrategy, LocatorSource } from '@prisma/client';

/**
 * 创建定位候选 DTO
 */
export class CreateLocatorCandidateDto {
  @ApiProperty({ description: '元素 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  elementId!: string;

  @ApiProperty({ description: '定位策略', enum: LocatorStrategy, example: 'TEXT' })
  @IsEnum(LocatorStrategy)
  strategy!: LocatorStrategy;

  @ApiProperty({ description: '定位值', example: '提交' })
  @IsString()
  @IsNotEmpty()
  locatorValue!: string;

  @ApiProperty({ description: '置信度分数（0-1）', example: 0.85 })
  @IsNumber()
  @Min(0)
  @Max(1)
  score!: number;

  @ApiProperty({ description: '来源', enum: LocatorSource, example: 'VISION' })
  @IsEnum(LocatorSource)
  source!: LocatorSource;

  @ApiProperty({ description: '是否为主定位', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({
    description: '动态标记',
    required: false,
    example: { hasTimestamp: false, hasUUID: false },
  })
  @IsOptional()
  @IsObject()
  dynamicFlags?: Record<string, any>;
}

/**
 * 生成定位候选请求 DTO
 */
export class GenerateLocatorsDto {
  @ApiProperty({ description: '元素 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  elementId!: string;

  @ApiProperty({ description: '截图路径', required: false })
  @IsOptional()
  @IsString()
  screenshotPath?: string;

  @ApiProperty({ description: 'DOM 数据', required: false })
  @IsOptional()
  @IsObject()
  domData?: any;

  @ApiProperty({ description: '是否使用历史数据', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  useHistorical?: boolean;
}
