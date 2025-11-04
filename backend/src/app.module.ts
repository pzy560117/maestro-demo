import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/common/prisma/prisma.module';
import { DevicesModule } from './modules/devices/devices.module';
import { AppsModule } from './modules/apps/apps.module';
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
    
    // 业务模块
    DevicesModule,
    AppsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

