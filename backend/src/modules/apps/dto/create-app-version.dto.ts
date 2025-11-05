import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Length, Matches, IsDateString } from 'class-validator';

/**
 * 创建应用版本DTO
 */
export class CreateAppVersionDto {
  @ApiProperty({
    description: '应用ID',
    example: 'uuid',
  })
  @IsString()
  appId!: string;

  @ApiProperty({
    description: '版本名称',
    example: '1.0.0',
  })
  @IsString()
  @Length(1, 32, { message: '版本名称长度必须在1-32字符之间' })
  @Matches(/^[\w.-]+$/, { message: '版本名称格式不正确' })
  version!: string;

  @ApiPropertyOptional({
    description: '版本号（整数）',
    example: 631,
  })
  @IsOptional()
  @IsInt({ message: '版本号必须是整数' })
  versionCode?: number;

  @ApiPropertyOptional({
    description: '版本说明',
    example: '修复已知问题，优化性能',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: '版本说明长度不能超过1000字符' })
  releaseNotes?: string;

  @ApiPropertyOptional({
    description: 'APK哈希值（SHA256）',
    example: 'sha256:...',
  })
  @IsOptional()
  @IsString()
  apkHash?: string;

  @ApiPropertyOptional({
    description: '发布时间',
    example: '2025-11-04T10:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '发布时间格式不正确' })
  releasedAt?: string;
}

