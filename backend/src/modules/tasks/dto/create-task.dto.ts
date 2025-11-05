import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsObject,
  IsArray,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { CoverageProfile } from '@prisma/client';

/**
 * 创建遍历任务 DTO
 * 实现功能 B：遍历任务创建（FR-01）
 * 
 * 验收标准：
 * 1. 未选择设备提交时，提示"请选择至少一台设备"
 * 2. 任务名称长度 ≤50 字符
 * 3. 黑名单路径数量 ≤50
 * 4. 一次最多选择 5 台设备
 */
export class CreateTaskDto {
  @ApiProperty({
    description: '任务名称',
    example: '审批核心流程遍历',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: '任务名称不能为空' })
  @MaxLength(50, { message: '任务名称长度不能超过50个字符' })
  name!: string;

  @ApiProperty({
    description: '应用版本ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID('4', { message: '应用版本ID格式错误' })
  @IsNotEmpty({ message: '应用版本不能为空' })
  appVersionId!: string;

  @ApiProperty({
    description: '设备ID列表',
    example: ['d1234567-89ab-cdef-0123-456789abcdef'],
    type: [String],
    minItems: 1,
    maxItems: 5,
  })
  @IsArray({ message: '设备列表必须是数组' })
  @ArrayMinSize(1, { message: '请选择至少一台设备' })
  @ArrayMaxSize(5, { message: '一次最多选择5台设备' })
  @IsUUID('4', { each: true, message: '设备ID格式错误' })
  deviceIds!: string[];

  @ApiProperty({
    description: '覆盖策略',
    enum: CoverageProfile,
    example: CoverageProfile.SMOKE,
  })
  @IsEnum(CoverageProfile, { message: '无效的覆盖策略' })
  coverageProfile!: CoverageProfile;

  @ApiPropertyOptional({
    description: '覆盖配置（黑名单路径、优先级等）',
    example: {
      blacklistPaths: ['/settings', '/about'],
      maxDepth: 10,
      timeout: 1800,
    },
  })
  @IsOptional()
  @IsObject({ message: '覆盖配置必须是对象' })
  coverageConfig?: {
    blacklistPaths?: string[];
    maxDepth?: number;
    timeout?: number;
    [key: string]: any;
  };

  @ApiPropertyOptional({
    description: '任务优先级（1-5，5最高）',
    example: 3,
    minimum: 1,
    maximum: 5,
    default: 3,
  })
  @IsOptional()
  @IsInt({ message: '优先级必须是整数' })
  @Min(1, { message: '优先级最小值为1' })
  @Max(5, { message: '优先级最大值为5' })
  priority?: number;

  @ApiPropertyOptional({
    description: '创建人ID（从认证信息获取）',
    example: 'u1234567-89ab-cdef-0123-456789abcdef',
  })
  @IsOptional()
  @IsUUID('4')
  createdBy?: string;

  @ApiPropertyOptional({
    description: '计划执行时间（可选，立即执行则不传）',
    example: '2025-11-05T10:00:00Z',
  })
  @IsOptional()
  scheduleAt?: Date;
}

