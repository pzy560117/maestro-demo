import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Length, Matches } from 'class-validator';

/**
 * 创建应用DTO
 */
export class CreateAppDto {
  @ApiProperty({
    description: '应用名称',
    example: '企业审批中心',
  })
  @IsString()
  @Length(1, 128, { message: '应用名称长度必须在1-128字符之间' })
  name!: string;

  @ApiProperty({
    description: 'Android包名',
    example: 'com.company.approval',
  })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, {
    message: 'Android包名格式不正确',
  })
  packageName!: string;

  @ApiPropertyOptional({
    description: '应用说明',
    example: '企业内部审批流程管理应用',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: '应用说明长度不能超过500字符' })
  description?: string;
}
