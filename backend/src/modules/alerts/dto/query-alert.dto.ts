import { IsEnum, IsOptional, IsInt, Min, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, AlertSeverity, AlertStatus } from '@prisma/client';
import { Type } from 'class-transformer';

/**
 * 查询告警DTO
 */
export class QueryAlertDto {
  @ApiPropertyOptional({
    description: '告警类型过滤',
    enum: AlertType,
  })
  @IsOptional()
  @IsEnum(AlertType)
  alertType?: AlertType;

  @ApiPropertyOptional({
    description: '严重级别过滤',
    enum: AlertSeverity,
  })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({
    description: '告警状态过滤',
    enum: AlertStatus,
  })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional({
    description: '关联任务运行ID',
  })
  @IsOptional()
  @IsUUID()
  taskRunId?: string;

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
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}

