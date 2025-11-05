import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsInt, Min, Max, IsOptional, IsObject, MaxLength } from 'class-validator';
import { TaskStatus, CoverageProfile } from '@prisma/client';

/**
 * 更新任务 DTO
 * 允许更新任务配置和状态
 */
export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: '任务名称',
    example: '审批核心流程遍历（更新）',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '任务名称长度不能超过50个字符' })
  name?: string;

  @ApiPropertyOptional({
    description: '覆盖策略',
    enum: CoverageProfile,
  })
  @IsOptional()
  @IsEnum(CoverageProfile, { message: '无效的覆盖策略' })
  coverageProfile?: CoverageProfile;

  @ApiPropertyOptional({
    description: '覆盖配置',
  })
  @IsOptional()
  @IsObject({ message: '覆盖配置必须是对象' })
  coverageConfig?: any;

  @ApiPropertyOptional({
    description: '任务优先级（1-5）',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt({ message: '优先级必须是整数' })
  @Min(1, { message: '优先级最小值为1' })
  @Max(5, { message: '优先级最大值为5' })
  priority?: number;

  @ApiPropertyOptional({
    description: '任务状态',
    enum: TaskStatus,
  })
  @IsOptional()
  @IsEnum(TaskStatus, { message: '无效的任务状态' })
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: '计划执行时间',
  })
  @IsOptional()
  scheduleAt?: Date;
}

