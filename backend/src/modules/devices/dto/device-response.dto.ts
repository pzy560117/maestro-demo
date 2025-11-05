import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType, DeviceStatus } from '@prisma/client';

/**
 * 设备响应DTO
 * 定义API返回的设备信息结构
 * 做字段映射：Prisma -> 前端
 */
export class DeviceResponseDto {
  @ApiProperty({ description: '设备ID', example: 'uuid' })
  id!: string;

  @ApiProperty({ description: '设备序列号', example: 'emulator-5554' })
  serialNumber!: string;

  @ApiProperty({ description: '设备型号', example: 'Pixel 6' })
  model!: string;

  @ApiProperty({ description: 'Android版本', example: '13' })
  androidVersion!: string;

  @ApiProperty({ description: '设备类型', enum: DeviceType })
  type!: DeviceType;

  @ApiPropertyOptional({ description: '屏幕分辨率', example: '1080x1920' })
  resolution?: string | null;

  @ApiProperty({ description: '设备状态', enum: DeviceStatus })
  status!: DeviceStatus;

  @ApiPropertyOptional({ description: '设备标签（字符串数组）' })
  tags?: string[];

  @ApiPropertyOptional({ description: '最后心跳时间' })
  lastHeartbeat?: Date | null;

  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: Date;

  constructor(device: any) {
    this.id = device.id;
    // 字段映射：Prisma -> 前端
    this.serialNumber = device.serial;
    this.model = device.model;
    // 移除"Android "前缀
    this.androidVersion = device.osVersion?.replace(/^Android\s+/, '') || device.osVersion;
    this.type = device.deviceType;
    this.resolution = device.resolution;
    this.status = device.status;
    // 将tags JSON对象转换为数组
    this.tags = device.tags ? Object.values(device.tags) : [];
    this.lastHeartbeat = device.lastHeartbeatAt;
    this.createdAt = device.createdAt;
    this.updatedAt = device.updatedAt;
  }
}

