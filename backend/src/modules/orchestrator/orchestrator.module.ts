import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';
import { StateMachineService } from './services/state-machine.service';
import { TaskRunService } from './services/task-run.service';
import { PrismaModule } from '../common/prisma/prisma.module';

/**
 * Orchestrator 模块
 * 实现功能 C：遍历调度状态机执行（FR-02）
 * 
 * 提供：
 * - 任务调度与执行
 * - 状态机管理
 * - 任务运行记录
 */
@Module({
  imports: [PrismaModule],
  controllers: [OrchestratorController],
  providers: [
    OrchestratorService,
    StateMachineService,
    TaskRunService,
  ],
  exports: [
    OrchestratorService,
    TaskRunService,
  ],
})
export class OrchestratorModule {}

