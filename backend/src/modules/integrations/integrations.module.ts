import { Module } from '@nestjs/common';
import { MidSceneService } from './midscene/midscene.service';
import { AppiumService } from './appium/appium.service';
import { MidSceneRealService } from './midscene/midscene-real.service';
import { MidSceneDashScopeService } from './midscene/midscene-dashscope.service';
import { AppiumRealService } from './appium/appium-real.service';
import { MinioService } from './storage/minio.service';
import { IntegrationsController } from './integrations.controller';

/**
 * 第三方集成模块
 * 包含 MidSceneJS、Appium 和 MinIO 集成
 *
 * 说明：
 * - Mock 服务：用于开发测试（默认）
 * - Real 服务：真实 API 集成（通过环境变量启用）
 * - DashScope 服务：使用阿里云视觉 API（推荐用于 MidSceneJS）
 */
@Module({
  controllers: [IntegrationsController],
  providers: [
    // Mock 服务（默认）
    MidSceneService,
    AppiumService,

    // 真实服务
    MidSceneRealService,
    MidSceneDashScopeService,
    AppiumRealService,
    MinioService,
  ],
  exports: [
    MidSceneService,
    AppiumService,
    MidSceneRealService,
    MidSceneDashScopeService,
    AppiumRealService,
    MinioService,
  ],
})
export class IntegrationsModule {}
