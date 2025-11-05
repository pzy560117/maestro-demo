import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 确认告警DTO
 */
export class AcknowledgeAlertDto {
  @ApiPropertyOptional({
    description: '确认人ID（用户UUID）',
    example: 'user-uuid',
  })
  @IsOptional()
  @IsUUID()
  ackBy?: string;

  @ApiPropertyOptional({
    description: '确认备注',
    maxLength: 500,
    example: '已修复定位策略，重新验证通过',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

