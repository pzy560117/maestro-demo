import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

/**
 * 任务管理模块
 * 实现功能 B：遍历任务创建与管理（FR-01）
 */
@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService], // 导出供 Orchestrator 模块使用
})
export class TasksModule {}

