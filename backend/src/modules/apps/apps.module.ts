import { Module } from '@nestjs/common';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { AppVersionsController } from './app-versions.controller';
import { AppVersionsService } from './app-versions.service';

/**
 * 应用版本管理模块
 * 提供应用和版本的CRUD功能
 */
@Module({
  controllers: [AppsController, AppVersionsController],
  providers: [AppsService, AppVersionsService],
  exports: [AppsService, AppVersionsService],
})
export class AppsModule {}

