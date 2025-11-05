import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { NotificationService } from './services/notification.service';
import { PrismaModule } from '../common/prisma/prisma.module';

/**
 * 告警模块
 * 提供告警管理和通知功能
 * Iteration 3: FR-12 告警通知与确认流程
 */
@Module({
  imports: [PrismaModule],
  controllers: [AlertsController],
  providers: [AlertsService, NotificationService],
  exports: [AlertsService],
})
export class AlertsModule {}

