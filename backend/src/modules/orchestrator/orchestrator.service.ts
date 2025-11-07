import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StateMachineService } from './services/state-machine.service';
import { TaskRunService } from './services/task-run.service';
import { OrchestratorState, TaskRunContext } from './types/orchestrator.types';
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

    // 自动启动调度器（默认启用，除非明确禁用）
    const autoStart = process.env.AUTO_START_SCHEDULER !== 'false';
    if (autoStart) {
      this.logger.log('Auto-starting scheduler...');
      await this.startScheduler();
    } else {
      this.logger.warn(
        'Scheduler auto-start disabled. Call POST /orchestrator/scheduler/start to start manually.',
      );
    }
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
        OR: [{ scheduleAt: null }, { scheduleAt: { lte: new Date() } }],
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
        this.logger.error(`Failed to execute task ${task.id}: ${err.message}`, err.stack);
      }
    }
  }

  /**
   * 为任务分配设备并开始执行
   */
  private async assignAndExecuteTask(taskId: string): Promise<void> {
    // 获取任务信息，包括指定的设备列表
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      this.logger.error(`Task ${taskId} not found`);
      return;
    }

    // 从 coverageConfig 中提取指定的设备列表
    const config = task.coverageConfig as any;
    const targetDeviceIds = Array.isArray(config?.deviceIds) ? config.deviceIds : [];

    // 查找可用设备：优先使用任务指定的设备
    const availableDevice = await this.prisma.device.findFirst({
      where: {
        status: DeviceStatus.AVAILABLE,
        ...(targetDeviceIds.length > 0 && { id: { in: targetDeviceIds } }),
      },
    });

    if (!availableDevice) {
      this.logger.warn(
        `No available device for task ${taskId}${targetDeviceIds.length > 0 ? ` (target devices: ${targetDeviceIds.join(', ')})` : ''}`,
      );
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

    this.logger.log(`Assigned task ${taskId} to device ${availableDevice.serial}`);

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
        // 执行状态转换（带超时保护）
        // BOOTSTRAPPING 状态需要更长时间（Appium 会话创建可能需要 2-3 分钟）
        const timeoutMs = context.currentState === OrchestratorState.BOOTSTRAPPING ? 180000 : 60000;
        const result = await this.executeStateTransitionWithTimeout(
          context.currentState,
          context,
          timeoutMs, // BOOTSTRAPPING: 180秒, 其他: 60秒
        );

        // 记录状态转换事件
        await this.taskRunService.recordEvent(context.taskRunId, EventType.STATE_CHANGE, {
          from: context.currentState,
          to: result.newState,
          success: result.success,
          error: result.error,
          data: result.data,
          timestamp: new Date().toISOString(),
        });

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
      await this.taskRunService.updateTaskRunStatus(context.taskRunId, TaskRunStatus.SUCCEEDED);

      this.logger.log(
        `Task ${taskId} completed successfully. Coverage: ${context.stats.coverageScreens} screens`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Task execution failed: ${err.message}`, err.stack);

      if (context) {
        await this.taskRunService.updateTaskRunStatus(
          context.taskRunId,
          TaskRunStatus.FAILED,
          err.message,
        );

        await this.taskRunService.recordEvent(context.taskRunId, EventType.ERROR, {
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
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

  /**
   * 带超时保护的状态转换执行
   * 防止状态机长时间卡住
   */
  private async executeStateTransitionWithTimeout(
    currentState: OrchestratorState,
    context: TaskRunContext,
    timeoutMs: number,
  ): Promise<{
    newState: OrchestratorState;
    success: boolean;
    error?: string;
    data?: any;
  }> {
    return Promise.race([
      this.stateMachine.transition(currentState, context),
      new Promise<{
        newState: OrchestratorState;
        success: boolean;
        error: string;
      }>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`State transition timeout after ${timeoutMs}ms (state: ${currentState})`),
            ),
          timeoutMs,
        ),
      ),
    ]).catch((error) => {
      const err = error as Error;
      this.logger.error(`State transition failed: ${err.message}`, err.stack);
      return {
        newState: OrchestratorState.RECOVERING,
        success: false,
        error: err.message,
      };
    });
  }

  /**
   * 扫描并修复卡住的任务
   * 定期扫描RUNNING状态超过阈值且无事件更新的任务，自动标记为FAILED
   */
  async fixStuckTasks(): Promise<{
    scanned: number;
    fixed: number;
    taskRunIds: string[];
  }> {
    const thresholdMinutes = 30; // 30分钟阈值
    const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    this.logger.log(`Scanning for stuck tasks (threshold: ${thresholdMinutes} minutes)`);

    // 查询所有RUNNING状态的任务运行
    const runningTaskRuns = await this.prisma.taskRun.findMany({
      where: {
        status: TaskRunStatus.RUNNING,
        startAt: {
          lt: thresholdTime, // 开始时间早于阈值
        },
      },
      include: {
        events: {
          orderBy: { occurredAt: 'desc' },
          take: 1,
        },
        device: true,
        task: true,
      },
    });

    this.logger.log(`Found ${runningTaskRuns.length} running tasks to check`);

    const fixedTaskRunIds: string[] = [];

    for (const taskRun of runningTaskRuns) {
      // 检查最后一次事件时间
      const lastEvent = taskRun.events[0];
      const lastEventTime = lastEvent?.occurredAt || taskRun.startAt;

      // 如果最后事件时间也超过阈值，认为任务卡住
      if (lastEventTime < thresholdTime) {
        this.logger.warn(
          `Detected stuck task run: ${taskRun.id} (task: ${taskRun.task.name}, device: ${taskRun.device.serial})`,
        );

        // 更新任务运行状态为FAILED
        await this.prisma.taskRun.update({
          where: { id: taskRun.id },
          data: {
            status: TaskRunStatus.FAILED,
            endAt: new Date(),
            failureReason: `Auto-fixed: Task stuck for more than ${thresholdMinutes} minutes without progress`,
          },
        });

        // 释放设备
        await this.prisma.device.update({
          where: { id: taskRun.deviceId },
          data: { status: DeviceStatus.AVAILABLE },
        });

        // 更新任务状态
        await this.prisma.task.update({
          where: { id: taskRun.taskId },
          data: { status: 'FAILED' },
        });

        // 记录修复事件
        await this.taskRunService.recordEvent(taskRun.id, EventType.NOTICE, {
          type: 'AUTO_FIX',
          reason: 'Task stuck without progress',
          thresholdMinutes,
          lastEventTime: lastEventTime.toISOString(),
          timestamp: new Date().toISOString(),
        });

        fixedTaskRunIds.push(taskRun.id);

        this.logger.log(`Fixed stuck task run: ${taskRun.id}`);
      }
    }

    const result = {
      scanned: runningTaskRuns.length,
      fixed: fixedTaskRunIds.length,
      taskRunIds: fixedTaskRunIds,
    };

    this.logger.log(`Stuck task scan complete: ${result.scanned} scanned, ${result.fixed} fixed`);

    return result;
  }
}
