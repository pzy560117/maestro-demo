import { IsOptional, IsInt, Min, IsUUID, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 查询 LLM 日志 DTO
 * Iteration 3: 功能 J - LLM 审计日志
 */
export class QueryLlmLogsDto {
  @ApiPropertyOptional({
    description: '任务运行ID过滤',
  })
  @IsOptional()
  @IsUUID()
  taskRunId?: string;

  @ApiPropertyOptional({
    description: '界面ID过滤',
  })
  @IsOptional()
  @IsUUID()
  screenId?: string;

  @ApiPropertyOptional({
    description: '模型名称过滤',
    example: 'qwen3-vl',
  })
  @IsOptional()
  @IsString()
  modelName?: string;

  @ApiPropertyOptional({
    description: '是否只查询错误日志',
    default: false,
  })
  @IsOptional()
  hasError?: boolean;

  @ApiPropertyOptional({
    description: '开始时间（ISO 8601）',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: '结束时间（ISO 8601）',
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: '页码',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    default: 50,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 50;
}
