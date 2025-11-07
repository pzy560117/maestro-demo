import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 应用响应DTO
 */
export class AppResponseDto {
  @ApiProperty({ description: '应用ID', example: 'uuid' })
  id!: string;

  @ApiProperty({ description: '应用名称', example: '企业审批中心' })
  name!: string;

  @ApiProperty({ description: 'Android包名', example: 'com.company.approval' })
  packageName!: string;

  @ApiPropertyOptional({ description: '应用说明' })
  description?: string | null;

  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: Date;

  constructor(partial: Partial<AppResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 应用版本响应DTO
 */
export class AppVersionResponseDto {
  @ApiProperty({ description: '版本ID', example: 'uuid' })
  id!: string;

  @ApiProperty({ description: '应用ID', example: 'uuid' })
  appId!: string;

  @ApiProperty({ description: '版本名称', example: '1.0.0' })
  version!: string;

  @ApiPropertyOptional({ description: '版本号', example: 100 })
  versionCode?: number | null;

  @ApiPropertyOptional({ description: '版本说明' })
  releaseNotes?: string | null;

  @ApiPropertyOptional({ description: 'APK哈希值' })
  apkHash?: string | null;

  @ApiPropertyOptional({ description: '发布时间' })
  releasedAt?: Date | null;

  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: '应用信息' })
  app?: AppResponseDto;

  constructor(partial: any) {
    // 映射字段：Prisma -> DTO
    this.id = partial.id;
    this.appId = partial.appId;
    this.version = partial.versionName; // Prisma 字段映射
    this.versionCode = partial.versionCode;
    this.releaseNotes = partial.changelog; // Prisma 字段映射
    this.apkHash = partial.apkHash;
    this.releasedAt = partial.releasedAt;
    this.createdAt = partial.createdAt;
    if (partial.app) {
      this.app = new AppResponseDto(partial.app);
    }
  }
}
