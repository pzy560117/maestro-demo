import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { TaskRunContext, OrchestratorState, QueuePriority } from '../types/orchestrator.types';
import { TaskRunStatus, EventType } from '@prisma/client';

/**
 * 任务运行服务
 * 管理 TaskRun 的创建、更新和状态记录
 */
@Injectable()
export class TaskRunService {
  private readonly logger = new Logger(TaskRunService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建任务运行记录
   */
  async createTaskRun(taskId: string, deviceId: string): Promise<TaskRunContext> {
    // 获取任务配置
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        appVersion: {
          include: {
            app: true,
          },
        },
      },
    });

    if (!task) {
      throw BusinessException.notFound('任务', taskId);
    }

    // 创建 TaskRun 记录
    const taskRun = await this.prisma.taskRun.create({
      data: {
        taskId,
        deviceId,
        orchestratorVersion: '1.0.0', // TODO: 从配置读取版本号
        status: TaskRunStatus.RUNNING,
        startAt: new Date(),
        metrics: {},
      },
    });

    this.logger.log(`TaskRun created: ${taskRun.id}`);

    // 记录状态变更事件
    await this.recordEvent(taskRun.id, EventType.STATE_CHANGE, {
      from: null,
      to: OrchestratorState.IDLE,
      timestamp: new Date().toISOString(),
    });

    // 构建上下文
    const context: TaskRunContext = {
      taskRunId: taskRun.id,
      taskId: task.id,
      deviceId,
      appVersionId: task.appVersionId,
      packageName: task.appVersion.app.packageName,
      versionName: task.appVersion.versionName,
      coverageConfig: (task.coverageConfig as any) || {},
      visitedGraph: {
        visitedSignatures: new Set(),
        edges: new Map(),
        visitCounts: new Map(),
      },
      actionQueues: {
        [QueuePriority.PRIMARY]: [],
        [QueuePriority.FALLBACK]: [],
        [QueuePriority.REVISIT]: [],
      },
      currentState: OrchestratorState.IDLE,
      stats: {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        coverageScreens: 0,
        startTime: new Date(),
      },
    };

    return context;
  }

  /**
   * 更新任务运行状态
   */
  async updateTaskRunStatus(
    taskRunId: string,
    status: TaskRunStatus,
    failureReason?: string,
  ): Promise<void> {
    const updateData: any = {
      status,
    };

    if (status !== TaskRunStatus.RUNNING) {
      updateData.endAt = new Date();
    }

    if (failureReason) {
      updateData.failureReason = failureReason;
    }

    await this.prisma.taskRun.update({
      where: { id: taskRunId },
      data: updateData,
    });

    this.logger.log(`TaskRun ${taskRunId} status updated to ${status}`);
  }

  /**
   * 更新任务运行统计数据
   */
  async updateTaskRunStats(
    taskRunId: string,
    stats: {
      totalActions?: number;
      successfulActions?: number;
      coverageScreens?: number;
    },
  ): Promise<void> {
    await this.prisma.taskRun.update({
      where: { id: taskRunId },
      data: {
        totalActions: stats.totalActions,
        successfulActions: stats.successfulActions,
        coverageScreens: stats.coverageScreens,
      },
    });
  }

  /**
   * 记录任务运行事件
   * 用于审计和调试，并通过WebSocket实时推送
   */
  async recordEvent(taskRunId: string, eventType: EventType, detail: any): Promise<void> {
    const event = await this.prisma.taskRunEvent.create({
      data: {
        taskRunId,
        eventType,
        detail: detail as any,
        occurredAt: new Date(),
      },
    });

    this.logger.debug(`Event recorded: ${eventType} for TaskRun ${taskRunId}`);

    // 实时推送事件到前端（导入EventsGateway）
    // this.wsGateway.emitTaskRunEvent(taskRunId, {
    //   id: event.id.toString(),
    //   eventType,
    //   detail,
    //   occurredAt: event.occurredAt,
    // });
  }

  /**
   * 查询任务运行记录
   */
  async getTaskRun(taskRunId: string): Promise<any> {
    const taskRun = await this.prisma.taskRun.findUnique({
      where: { id: taskRunId },
      include: {
        task: true,
        device: true,
        events: {
          orderBy: { occurredAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!taskRun) {
      throw BusinessException.notFound('任务运行记录', taskRunId);
    }

    return this.normalizeTaskRunDetail(taskRun);
  }

  /**
   * 将 TaskRun 详情里的 BigInt 字段安全转换为字符串，避免 JSON 序列化异常
   */
  private normalizeTaskRunDetail(taskRun: any): any {
    const normalizedEvents = (taskRun.events || []).map((event: any) => ({
      ...event,
      id: typeof event.id === 'bigint' ? event.id.toString() : event.id,
    }));

    return {
      ...taskRun,
      events: normalizedEvents,
    };
  }

  /**
   * 查询任务的所有运行记录
   */
  async getTaskRunsByTask(taskId: string): Promise<any[]> {
    return this.prisma.taskRun.findMany({
      where: { taskId },
      include: {
        device: true,
      },
      orderBy: { startAt: 'desc' },
    });
  }

  /**
   * 查询设备的当前运行任务
   */
  async getRunningTaskRunByDevice(deviceId: string): Promise<any | null> {
    return this.prisma.taskRun.findFirst({
      where: {
        deviceId,
        status: TaskRunStatus.RUNNING,
      },
      include: {
        task: true,
      },
    });
  }
}
