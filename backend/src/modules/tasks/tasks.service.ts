import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { EventsGateway } from '../websocket/websocket.gateway';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { TaskStatus, DeviceStatus } from '@prisma/client';
import { OrchestratorService } from '../orchestrator/orchestrator.service';

/**
 * 任务管理服务
 * 实现功能 B：遍历任务创建与管理（FR-01）
 *
 * 验收标准：
 * 1. 未选择设备提交时，提示"请选择至少一台设备"（DTO层校验）
 * 2. 同一个设备若已有运行任务，提示"设备正忙"
 * 3. 创建成功后，可在任务列表看到新任务，状态 QUEUED
 * 4. API POST /tasks 返回任务 ID，并在 DB tasks 表有记录
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: EventsGateway,
    @Inject(forwardRef(() => OrchestratorService))
    private readonly orchestratorService: OrchestratorService,
  ) {}

  /**
   * 创建遍历任务
   *
   * 业务逻辑：
   * 1. 验证应用版本存在
   * 2. 验证所有设备存在且状态为 AVAILABLE
   * 3. 检查设备是否正在执行其他任务（状态为 BUSY）
   * 4. 验证覆盖配置中的黑名单路径数量
   * 5. 创建任务记录，状态为 QUEUED
   */
  async create(createTaskDto: CreateTaskDto): Promise<TaskResponseDto> {
    const { appVersionId, deviceIds, coverageConfig } = createTaskDto;

    // 1. 验证应用版本存在
    const appVersion = await this.prisma.appVersion.findUnique({
      where: { id: appVersionId },
      include: {
        app: {
          select: { name: true, packageName: true },
        },
      },
    });

    if (!appVersion) {
      throw BusinessException.notFound('应用版本', appVersionId);
    }

    // 2. 验证所有设备存在
    const devices = await this.prisma.device.findMany({
      where: { id: { in: deviceIds } },
    });

    if (devices.length !== deviceIds.length) {
      const foundIds = devices.map((d) => d.id);
      const missingIds = deviceIds.filter((id) => !foundIds.includes(id));
      throw BusinessException.badRequest(`设备不存在：${missingIds.join(', ')}`);
    }

    // 3. 检查设备可用性
    const unavailableDevices = devices.filter((d) => d.status !== DeviceStatus.AVAILABLE);

    if (unavailableDevices.length > 0) {
      const unavailableList = unavailableDevices.map((d) => `${d.serial} (${d.status})`).join(', ');
      throw BusinessException.badRequest(`设备不可用：${unavailableList}`);
    }

    // 4. 检查设备是否正忙（有正在运行的任务）
    const busyDevices = await this.prisma.taskRun.findMany({
      where: {
        deviceId: { in: deviceIds },
        status: 'RUNNING',
      },
      include: {
        device: { select: { serial: true } },
        task: { select: { name: true } },
      },
    });

    if (busyDevices.length > 0) {
      const busyList = busyDevices
        .map((tr) => `${tr.device.serial} (执行任务: ${tr.task.name})`)
        .join(', ');
      throw BusinessException.badRequest(`设备正忙：${busyList}`);
    }

    // 5. 验证黑名单路径数量（功能 B 边界条件）
    if (coverageConfig?.blacklistPaths) {
      if (!Array.isArray(coverageConfig.blacklistPaths)) {
        throw BusinessException.badRequest('黑名单路径必须是数组');
      }
      if (coverageConfig.blacklistPaths.length > 50) {
        throw BusinessException.badRequest('黑名单路径数量不能超过50');
      }
    }

    // 6. 创建任务
    const task = await this.prisma.task.create({
      data: {
        name: createTaskDto.name,
        appVersionId: createTaskDto.appVersionId,
        coverageProfile: createTaskDto.coverageProfile,
        coverageConfig: {
          ...(createTaskDto.coverageConfig || {}),
          deviceIds, // 存储设备ID列表到 coverageConfig
        } as any,
        priority: createTaskDto.priority || 3,
        status: TaskStatus.QUEUED,
        createdBy: createTaskDto.createdBy || null,
        scheduleAt: createTaskDto.scheduleAt || null,
      },
      include: {
        appVersion: {
          include: {
            app: true,
          },
        },
      },
    });

    this.logger.log(`Task created: ${task.id} (${task.name}), devices: ${deviceIds.join(', ')}`);

    // 推送 WebSocket 任务创建事件
    this.wsGateway.emitTaskUpdate(task.id, task.status, {
      name: task.name,
      appVersion: appVersion.app.name,
      deviceCount: deviceIds.length,
    });

    // TODO: 在 Iteration 1 后续步骤，将任务提交给 Orchestrator 调度
    // 当前仅创建任务记录，状态为 QUEUED

    return new TaskResponseDto(task);
  }

  /**
   * 查询所有任务（支持分页和筛选）
   */
  async findAll(params?: {
    status?: TaskStatus;
    appVersionId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: TaskResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.appVersionId) {
      where.appVersionId = params.appVersionId;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          appVersion: {
            include: {
              app: true,
            },
          },
          _count: {
            select: { taskRuns: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip,
      }),
      this.prisma.task.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: tasks.map((task) => new TaskResponseDto(task)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 根据 ID 查询任务详情
   */
  async findOne(id: string): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        appVersion: {
          include: {
            app: true,
          },
        },
        _count: {
          select: { taskRuns: true },
        },
      },
    });

    if (!task) {
      throw BusinessException.notFound('任务', id);
    }

    return new TaskResponseDto(task);
  }

  /**
   * 更新任务
   * 注意：仅允许更新 DRAFT 和 QUEUED 状态的任务
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<TaskResponseDto> {
    // 检查任务是否存在
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw BusinessException.notFound('任务', id);
    }

    // 限制：仅允许更新未执行的任务
    if (existingTask.status !== TaskStatus.DRAFT && existingTask.status !== TaskStatus.QUEUED) {
      throw BusinessException.badRequest(`任务状态为 ${existingTask.status}，不允许修改`);
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        name: updateTaskDto.name,
        coverageProfile: updateTaskDto.coverageProfile,
        coverageConfig:
          updateTaskDto.coverageConfig !== undefined
            ? (updateTaskDto.coverageConfig as any)
            : undefined,
        priority: updateTaskDto.priority,
        status: updateTaskDto.status,
        scheduleAt: updateTaskDto.scheduleAt,
      },
      include: {
        appVersion: {
          include: {
            app: true,
          },
        },
      },
    });

    this.logger.log(`Task updated: ${task.id}`);

    // 推送 WebSocket 任务更新事件
    if (updateTaskDto.status && updateTaskDto.status !== existingTask.status) {
      this.wsGateway.emitTaskUpdate(task.id, task.status, {
        name: task.name,
      });
    }

    return new TaskResponseDto(task);
  }

  /**
   * 删除任务
   * 注意：仅允许删除 DRAFT、COMPLETED、FAILED 状态的任务
   */
  async remove(id: string): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw BusinessException.notFound('任务', id);
    }

    // 限制：不允许删除进行中的任务
    if (task.status === TaskStatus.RUNNING || task.status === TaskStatus.QUEUED) {
      throw BusinessException.badRequest(`任务状态为 ${task.status}，不允许删除`);
    }

    await this.prisma.task.delete({
      where: { id },
    });

    this.logger.log(`Task deleted: ${task.id} (${task.name})`);
  }

  /**
   * 取消任务
   * 允许取消 QUEUED 或 RUNNING 状态的任务
   */
  async cancel(id: string): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        appVersion: {
          include: {
            app: true,
          },
        },
      },
    });

    if (!task) {
      throw BusinessException.notFound('任务', id);
    }

    if (task.status !== TaskStatus.QUEUED && task.status !== TaskStatus.RUNNING) {
      throw BusinessException.badRequest(`任务状态为 ${task.status}，无法取消`);
    }

    // 更新任务状态为 CANCELLED（用户主动取消）
    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: { status: TaskStatus.CANCELLED },
      include: {
        appVersion: {
          include: {
            app: true,
          },
        },
      },
    });

    // 推送 WebSocket 任务取消事件
    this.wsGateway.emitTaskUpdate(updatedTask.id, updatedTask.status, {
      name: updatedTask.name,
      cancelled: true,
    });

    // TODO: 通知 Orchestrator 停止执行

    this.logger.log(`Task cancelled: ${task.id}`);

    return new TaskResponseDto(updatedTask);
  }

  /**
   * 重试任务
   * 将失败或取消的任务重新加入队列
   */
  async retry(id: string): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        appVersion: {
          include: {
            app: true,
          },
        },
      },
    });

    if (!task) {
      throw BusinessException.notFound('任务', id);
    }

    // 只允许重试失败、取消或完成的任务
    const retryableStatuses: TaskStatus[] = [
      TaskStatus.FAILED,
      TaskStatus.CANCELLED,
      TaskStatus.COMPLETED,
    ];

    if (!retryableStatuses.includes(task.status)) {
      throw BusinessException.badRequest(`任务状态为 ${task.status}，不允许重试`);
    }

    // 更新任务状态为排队
    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.QUEUED,
        updatedAt: new Date(),
      },
      include: {
        appVersion: {
          include: {
            app: true,
          },
        },
      },
    });

    this.logger.log(`Task ${task.id} queued for retry`);

    // 触发任务执行
    try {
      await this.orchestratorService.triggerTaskExecution(updatedTask.id);
      this.logger.log(`Task ${task.id} execution triggered`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to trigger task execution: ${err.message}`);
      // 即使触发失败，任务也已经进入队列，调度器会处理
    }

    return new TaskResponseDto(updatedTask);
  }

  /**
   * 获取待执行任务队列
   * 供 Orchestrator 调度使用
   */
  async getPendingTasks(limit: number = 10): Promise<TaskResponseDto[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        status: TaskStatus.QUEUED,
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
      take: limit,
    });

    return tasks.map((task) => new TaskResponseDto(task));
  }

  /**
   * 获取任务统计信息
   */
  async getStats(): Promise<{
    total: number;
    running: number;
    queued: number;
    succeeded: number;
    failed: number;
    cancelled: number;
  }> {
    const [total, running, queued, succeeded, failed, cancelled] = await Promise.all([
      this.prisma.task.count(),
      this.prisma.task.count({ where: { status: TaskStatus.RUNNING } }),
      this.prisma.task.count({ where: { status: TaskStatus.QUEUED } }),
      this.prisma.task.count({ where: { status: TaskStatus.COMPLETED } }),
      this.prisma.task.count({ where: { status: TaskStatus.FAILED } }),
      this.prisma.task.count({ where: { status: TaskStatus.CANCELLED } }),
    ]);

    return {
      total,
      running,
      queued,
      succeeded,
      failed,
      cancelled,
    };
  }

  /**
   * 获取任务的所有运行记录
   * @param taskId 任务ID
   * @returns 运行记录列表
   */
  async getTaskRuns(taskId: string): Promise<any[]> {
    // 先验证任务存在
    await this.findOne(taskId);

    const taskRuns = await this.prisma.taskRun.findMany({
      where: { taskId },
      include: {
        device: {
          select: {
            id: true,
            serial: true,
            model: true,
            deviceType: true,
          },
        },
      },
      orderBy: { startAt: 'desc' },
    });

    return taskRuns.map((run) => ({
      id: run.id,
      taskId: run.taskId,
      deviceId: run.deviceId,
      device: run.device,
      status: run.status,
      startAt: run.startAt,
      endAt: run.endAt,
      totalActions: run.totalActions,
      successfulActions: run.successfulActions,
      coverageScreens: run.coverageScreens,
      failureReason: run.failureReason,
      metrics: run.metrics,
      createdAt: run.createdAt,
    }));
  }
}
