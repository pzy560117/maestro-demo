import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DeviceStatus } from '@prisma/client';
import { CreateDeviceDto } from './create-device.dto';

/**
 * 更新设备DTO
 * 所有字段可选
 */
export class UpdateDeviceDto extends PartialType(CreateDeviceDto) {
  @ApiPropertyOptional({
    description: '设备状态',
    enum: DeviceStatus,
    example: DeviceStatus.OFFLINE,
  })
  @IsOptional()
  @IsEnum(DeviceStatus, { message: '设备状态不合法' })
  status?: DeviceStatus;
}
