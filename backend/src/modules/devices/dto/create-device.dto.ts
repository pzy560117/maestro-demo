import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  Length,
  Matches,
} from 'class-validator';
import { DeviceType } from '@prisma/client';

/**
 * 创建设备DTO
 * 遵循参数校验规范
 */
export class CreateDeviceDto {
  @ApiProperty({
    description: '设备序列号/模拟器ID',
    example: 'emulator-5554',
    minLength: 1,
    maxLength: 64,
  })
  @IsString()
  @Length(1, 64, { message: '序列号长度必须在1-64字符之间' })
  serial!: string;

  @ApiProperty({
    description: '设备型号',
    example: 'Pixel 6',
  })
  @IsString()
  @Length(1, 128, { message: '型号长度必须在1-128字符之间' })
  model!: string;

  @ApiProperty({
    description: 'Android版本',
    example: 'Android 13',
  })
  @IsString()
  @Matches(/^Android\s+\d+(\.\d+)?$/, {
    message: 'Android版本格式不正确，应为"Android X"或"Android X.Y"',
  })
  osVersion!: string;

  @ApiProperty({
    description: '设备类型',
    enum: DeviceType,
    example: DeviceType.EMULATOR,
  })
  @IsEnum(DeviceType, { message: '设备类型必须是REAL或EMULATOR' })
  deviceType!: DeviceType;

  @ApiPropertyOptional({
    description: '屏幕分辨率',
    example: '1080x1920',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+x\d+$/, { message: '分辨率格式不正确，应为"宽x高"' })
  resolution?: string;

  @ApiPropertyOptional({
    description: '设备标签（JSON对象）',
    example: { location: 'lab-01', mdm: 'enabled' },
  })
  @IsOptional()
  @IsObject()
  tags?: Record<string, unknown>;
}

