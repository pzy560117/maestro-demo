import { IsEnum, IsOptional, IsString, IsUUID, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, AlertSeverity } from '@prisma/client';

/**
 * 创建告警DTO
 * 符合FR-12告警通知要求
 */
export class CreateAlertDto {
  @ApiPropertyOptional({
    description: '关联任务运行ID',
    example: 'task-run-uuid',
  })
  @IsOptional()
  @IsUUID()
  taskRunId?: string;

  @ApiPropertyOptional({
    description: '关联界面ID',
    example: 'screen-uuid',
  })
  @IsOptional()
  @IsUUID()
  screenId?: string;

  @ApiPropertyOptional({
    description: '关联元素ID',
    example: 'element-uuid',
  })
  @IsOptional()
  @IsUUID()
  elementId?: string;

  @ApiProperty({
    description: '告警类型',
    enum: AlertType,
    example: 'LOCATOR_FAILURE',
  })
  @IsEnum(AlertType)
  alertType!: AlertType;

  @ApiProperty({
    description: '严重级别',
    enum: AlertSeverity,
    example: 'P2',
  })
  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;

  @ApiProperty({
    description: '告警消息',
    maxLength: 500,
    example: '定位验证失败：提交按钮无法点击',
  })
  @IsString()
  @MaxLength(500)
  message!: string;

  @ApiPropertyOptional({
    description: '告警附加数据',
    example: { failureCount: 3, locatorValue: 'com.example:id/submit' },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}

