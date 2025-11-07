import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';
import { StateMachineService } from './services/state-machine.service';
import { TaskRunService } from './services/task-run.service';
import { ScreenCaptureService } from './services/screen-capture.service';
import { ActionExecutorService } from './services/action-executor.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { LlmModule } from '../llm/llm.module';
import { ScreensModule } from '../screens/screens.module';

/**
 * Orchestrator 模块
 * 实现功能 C：遍历调度状态机执行（FR-02）
 *
 * 提供：
 * - 任务调度与执行
 * - 状态机管理
 * - 任务运行记录
 * - 截图捕获
 * - 动作执行
 */
@Module({
  imports: [PrismaModule, IntegrationsModule, ScreensModule, LlmModule],
  controllers: [OrchestratorController],
  providers: [
    OrchestratorService,
    StateMachineService,
    TaskRunService,
    ScreenCaptureService,
    ActionExecutorService,
  ],
  exports: [OrchestratorService, TaskRunService],
})
export class OrchestratorModule {}
