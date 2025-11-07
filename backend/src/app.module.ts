import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/common/prisma/prisma.module';
import { DevicesModule } from './modules/devices/devices.module';
import { AppsModule } from './modules/apps/apps.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { LlmModule } from './modules/llm/llm.module';
import { ScreensModule } from './modules/screens/screens.module';
import { LocatorsModule } from './modules/locators/locators.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { HealthController } from './modules/common/health/health.controller';

/**
 * 应用根模块
 * 统一注册所有功能模块，遵循NestJS模块化架构
 */
@Module({
  imports: [
    // 配置模块 - 加载环境变量
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // 数据库模块
    PrismaModule,

    // WebSocket 模块（全局）
    WebSocketModule,

    // 业务模块
    DevicesModule,
    AppsModule,
    TasksModule,
    OrchestratorModule,
    LlmModule,

    // Iteration 2 新增模块
    ScreensModule,
    LocatorsModule,
    IntegrationsModule,

    // Iteration 3 新增模块
    AlertsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
