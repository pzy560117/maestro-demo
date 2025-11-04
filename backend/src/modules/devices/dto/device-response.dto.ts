import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType, DeviceStatus } from '@prisma/client';

/**
 * 设备响应DTO
 * 定义API返回的设备信息结构
 */
export class DeviceResponseDto {
  @ApiProperty({ description: '设备ID', example: 'uuid' })
  id!: string;

  @ApiProperty({ description: '设备序列号', example: 'emulator-5554' })
  serial!: string;

  @ApiProperty({ description: '设备型号', example: 'Pixel 6' })
  model!: string;

  @ApiProperty({ description: 'Android版本', example: 'Android 13' })
  osVersion!: string;

  @ApiProperty({ description: '设备类型', enum: DeviceType })
  deviceType!: DeviceType;

  @ApiPropertyOptional({ description: '屏幕分辨率', example: '1080x1920' })
  resolution?: string | null;

  @ApiProperty({ description: '设备状态', enum: DeviceStatus })
  status!: DeviceStatus;

  @ApiPropertyOptional({ description: '设备标签' })
  tags?: any;

  @ApiPropertyOptional({ description: '最后心跳时间' })
  lastHeartbeatAt?: Date | null;

  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  constructor(partial: Partial<DeviceResponseDto>) {
    Object.assign(this, partial);
  }
}

