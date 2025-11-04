import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { AdbService } from './services/adb.service';

/**
 * 设备管理模块
 * 提供设备注册、查询、状态管理功能
 */
@Module({
  controllers: [DevicesController],
  providers: [DevicesService, AdbService],
  exports: [DevicesService],
})
export class DevicesModule {}

