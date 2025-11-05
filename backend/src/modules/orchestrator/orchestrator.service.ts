import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StateMachineService } from './services/state-machine.service';
import { TaskRunService } from './services/task-run.service';
import {
  OrchestratorState,
  TaskRunContext,
} from './types/orchestrator.types';
import { TaskRunStatus, EventType, DeviceStatus } from '@prisma/client';

/**
 * Orchestrator 核心服务
 * 实现功能 C：遍历调度状态机执行（FR-02）
 * 
 * 职责：
 * 1. 从任务队列中获取待执行任务
 * 2. 为任务分配可用设备
 * 3. 驱动状态机执行任务
 * 4. 记录执行事件和结果
 * 
 * 验收标准：
 * 1. 当界面重复时，VisitedGraph 阻止重复动作，队列降级
 * 2. 执行失败时调用回退策略（UI Undo → App Restart），记录在 task_run_events
 * 3. 任务完成后状态变为 SUCCEEDED，覆盖界面数≥配置要求
 * 4. 任务失败时 failure_reason 包含具体动作/错误码
 */
@Injectable()
export class OrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(OrchestratorService.name);
  private isRunning: boolean = false;
  private runningContexts: Map<string, TaskRunContext> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: StateMachineService,
    private readonly taskRunService: TaskRunService,
  ) {}

  /**
   * 模块初始化时启动调度循环
   */
  async onModuleInit() {
    this.logger.log('Orchestrator service initialized');
    
    // TODO: 在生产环境中启用自动调度
    // await this.startScheduler();
  }

  /**
   * 启动调度器
   * 定期从任务队列中取任务执行
   */
  async startScheduler(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.logger.log('Scheduler started');

    // 每隔 10 秒检查一次待执行任务
    const schedulerInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(schedulerInterval);
        return;
      }

      try {
        await this.pollAndExecuteTasks();
      } catch (error) {
        const err = error as Error;
        this.logger.error(`Scheduler error: ${err.message}`, err.stack);
      }
    }, 10000);
  }

  /**
   * 停止调度器
   */
  stopScheduler(): void {
    this.isRunning = false;
    this.logger.log('Scheduler stopped');
  }

  /**
   * 轮询并执行待处理任务
   */
  private async pollAndExecuteTasks(): Promise<void> {
    // 获取待执行任务（状态为 QUEUED，且计划时间已到）
    const pendingTasks = await this.prisma.task.findMany({
      where: {
        status: 'QUEUED',
        OR: [
          { scheduleAt: null },
          { scheduleAt: { lte: new Date() } },
        ],
      },
      include: {
        appVersion: {
          include: {
            app: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 5, // 每次最多处理 5 个任务
    });

    if (pendingTasks.length === 0) {
      this.logger.debug('No pending tasks');
      return;
    }

    this.logger.log(`Found ${pendingTasks.length} pending tasks`);

    for (const task of pendingTasks) {
      try {
        // 为任务分配设备并开始执行
        await this.assignAndExecuteTask(task.id);
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Failed to execute task ${task.id}: ${err.message}`,
          err.stack,
        );
      }
    }
  }

  /**
   * 为任务分配设备并开始执行
   */
  private async assignAndExecuteTask(taskId: string): Promise<void> {
    // 查找可用设备
    const availableDevice = await this.prisma.device.findFirst({
      where: {
        status: DeviceStatus.AVAILABLE,
      },
    });

    if (!availableDevice) {
      this.logger.warn(`No available device for task ${taskId}`);
      return;
    }

    // 标记设备为忙碌
    await this.prisma.device.update({
      where: { id: availableDevice.id },
      data: { status: DeviceStatus.BUSY },
    });

    // 更新任务状态为 RUNNING
    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'RUNNING' },
    });

    this.logger.log(
      `Assigned task ${taskId} to device ${availableDevice.serial}`,
    );

    // 开始执行任务
    await this.executeTask(taskId, availableDevice.id);
  }

  /**
   * 执行任务
   * 驱动状态机完成整个遍历流程
   * 
   * 验收标准：
   * - 状态流转正确
   * - 事件记录完整
   * - 统计数据准确
   */
  async executeTask(taskId: string, deviceId: string): Promise<void> {
    let context: TaskRunContext | undefined;

    try {
      // 创建 TaskRun 记录和上下文
      context = await this.taskRunService.createTaskRun(taskId, deviceId);
      this.runningContexts.set(context.taskRunId, context);

      this.logger.log(`Executing task ${taskId} on device ${deviceId}`);

      // 状态机循环
      while (context.currentState !== OrchestratorState.TERMINATED) {
        // 执行状态转换
        const result = await this.stateMachine.transition(
          context.currentState,
          context,
        );

        // 记录状态转换事件
        await this.taskRunService.recordEvent(
          context.taskRunId,
          EventType.STATE_CHANGE,
          {
            from: context.currentState,
            to: result.newState,
            success: result.success,
            error: result.error,
            data: result.data,
            timestamp: new Date().toISOString(),
          },
        );

        // 更新上下文状态
        context.currentState = result.newState;

        // 更新统计数据
        await this.taskRunService.updateTaskRunStats(context.taskRunId, {
          totalActions: context.stats.totalActions,
          successfulActions: context.stats.successfulActions,
          coverageScreens: context.stats.coverageScreens,
        });

        // 如果转换失败且无法恢复，终止任务
        if (!result.success && result.newState === OrchestratorState.TERMINATED) {
          await this.taskRunService.updateTaskRunStatus(
            context.taskRunId,
            TaskRunStatus.FAILED,
            result.error,
          );
          break;
        }
      }

      // 任务完成，更新状态
      await this.taskRunService.updateTaskRunStatus(
        context.taskRunId,
        TaskRunStatus.SUCCEEDED,
      );

      this.logger.log(
        `Task ${taskId} completed successfully. Coverage: ${context.stats.coverageScreens} screens`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Task execution failed: ${err.message}`,
        err.stack,
      );

      if (context) {
        await this.taskRunService.updateTaskRunStatus(
          context.taskRunId,
          TaskRunStatus.FAILED,
          err.message,
        );

        await this.taskRunService.recordEvent(
          context.taskRunId,
          EventType.ERROR,
          {
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
          },
        );
      }
    } finally {
      // 清理资源
      if (context) {
        this.runningContexts.delete(context.taskRunId);
      }

      // 释放设备
      await this.prisma.device.update({
        where: { id: deviceId },
        data: { status: DeviceStatus.AVAILABLE },
      });

      // 更新任务状态为 COMPLETED
      await this.prisma.task.update({
        where: { id: taskId },
        data: { status: 'COMPLETED' },
      });
    }
  }

  /**
   * 手动触发任务执行（供 API 调用）
   */
  async triggerTaskExecution(taskId: string): Promise<{ taskRunId: string }> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'QUEUED') {
      throw new Error(`Task ${taskId} is not in QUEUED state`);
    }

    // 异步执行任务
    this.assignAndExecuteTask(taskId).catch((error) => {
      this.logger.error(`Failed to trigger task: ${error.message}`);
    });

    // 返回提示（实际 TaskRun 还未创建，需要等待设备分配）
    return { taskRunId: 'pending' };
  }

  /**
   * 获取当前运行的任务列表
   */
  getRunningContexts(): TaskRunContext[] {
    return Array.from(this.runningContexts.values());
  }
}

