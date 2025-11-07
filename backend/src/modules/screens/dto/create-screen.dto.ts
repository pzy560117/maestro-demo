import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsEnum,
  IsOptional,
  IsUUID,
  IsObject,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScreenOrientation } from '@prisma/client';

/**
 * 元素信息 DTO
 */
export class ElementInfoDto {
  @ApiProperty({ description: '元素类型', example: 'Button' })
  @IsString()
  @IsNotEmpty()
  elementType!: string;

  @ApiProperty({
    description: 'Resource ID',
    required: false,
    example: 'com.example:id/submit_button',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiProperty({ description: '内容描述', required: false, example: '提交按钮' })
  @IsOptional()
  @IsString()
  contentDesc?: string;

  @ApiProperty({ description: '文本值', required: false, example: '提交' })
  @IsOptional()
  @IsString()
  textValue?: string;

  @ApiProperty({ description: '无障碍标签', required: false })
  @IsOptional()
  @IsString()
  accessibilityLabel?: string;

  @ApiProperty({ description: 'XPath', required: false })
  @IsOptional()
  @IsString()
  xpath?: string;

  @ApiProperty({ description: '边界坐标', example: { x: 100, y: 200, width: 300, height: 50 } })
  @IsObject()
  bounds!: Record<string, any>;

  @ApiProperty({ description: '是否可见', example: 'VISIBLE' })
  @IsEnum(['VISIBLE', 'HIDDEN', 'GONE'])
  visibility!: string;

  @ApiProperty({ description: '是否可交互', example: true })
  interactable!: boolean;
}

/**
 * 创建界面 DTO
 */
export class CreateScreenDto {
  @ApiProperty({ description: '应用版本 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  appVersionId!: string;

  @ApiProperty({
    description: '截图路径（相对路径或URL）',
    example: 'screenshots/2024-01/screen_abc123.webp',
  })
  @IsString()
  @IsNotEmpty()
  screenshotPath!: string;

  @ApiProperty({
    description: '缩略图路径',
    required: false,
    example: 'screenshots/2024-01/thumb_abc123.webp',
  })
  @IsOptional()
  @IsString()
  screenshotThumbPath?: string;

  @ApiProperty({
    description: '截图预签名访问地址',
    required: false,
    example:
      'https://minio.example.com/maestro-screenshots/2024-01/screen_abc123.webp?X-Amz-Expires=300',
  })
  @IsOptional()
  @IsString()
  screenshotPublicUrl?: string;

  @ApiProperty({ description: 'DOM JSON 路径', example: 'dom/2024-01/dom_abc123.json' })
  @IsString()
  @IsNotEmpty()
  domPath!: string;

  @ApiProperty({ description: '主要文案', required: false, example: '登录页面' })
  @IsOptional()
  @IsString()
  primaryText?: string;

  @ApiProperty({ description: '屏幕方向', enum: ScreenOrientation, example: 'PORTRAIT' })
  @IsEnum(ScreenOrientation)
  orientation!: ScreenOrientation;

  @ApiProperty({ description: '宽度（像素）', example: 1080 })
  @IsInt()
  @Min(1)
  width!: number;

  @ApiProperty({ description: '高度（像素）', example: 1920 })
  @IsInt()
  @Min(1)
  height!: number;

  @ApiProperty({ description: '设备型号', required: false, example: 'Pixel 6' })
  @IsOptional()
  @IsString()
  deviceModel?: string;

  @ApiProperty({ description: '来源任务运行 ID', required: false })
  @IsOptional()
  @IsUUID()
  sourceTaskRunId?: string;

  @ApiProperty({ description: '来源动作 ID', required: false })
  @IsOptional()
  @IsUUID()
  sourceActionId?: string;

  @ApiProperty({ description: '元数据', required: false, example: { captureMethod: 'appium' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: '元素列表', type: [ElementInfoDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ElementInfoDto)
  elements?: ElementInfoDto[];
}
