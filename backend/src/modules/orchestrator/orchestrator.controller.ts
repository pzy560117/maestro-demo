import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { OrchestratorService } from './orchestrator.service';
import { TaskRunService } from './services/task-run.service';

/**
 * Orchestrator 控制器
 * 提供调度器管理和任务运行查询接口
 */
@ApiTags('Orchestrator - 调度器管理')
@Controller('orchestrator')
export class OrchestratorController {
  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly taskRunService: TaskRunService,
  ) {}

  /**
   * 启动调度器
   */
  @Post('scheduler/start')
  @ApiOperation({
    summary: '启动调度器',
    description: '启动任务调度循环，开始轮询并执行待处理任务',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '调度器启动成功',
  })
  async startScheduler(): Promise<{ message: string }> {
    await this.orchestratorService.startScheduler();
    return { message: 'Scheduler started' };
  }

  /**
   * 停止调度器
   */
  @Post('scheduler/stop')
  @ApiOperation({
    summary: '停止调度器',
    description: '停止任务调度循环',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '调度器停止成功',
  })
  stopScheduler(): { message: string } {
    this.orchestratorService.stopScheduler();
    return { message: 'Scheduler stopped' };
  }

  /**
   * 手动触发任务执行
   */
  @Post('tasks/:taskId/trigger')
  @ApiOperation({
    summary: '手动触发任务执行',
    description: '立即执行指定任务，无需等待调度器轮询',
  })
  @ApiParam({
    name: 'taskId',
    type: String,
    description: '任务ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '任务触发成功',
  })
  async triggerTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<{ taskRunId: string }> {
    return this.orchestratorService.triggerTaskExecution(taskId);
  }

  /**
   * 获取当前运行中的任务
   */
  @Get('running')
  @ApiOperation({
    summary: '获取运行中的任务',
    description: '查看当前正在执行的所有任务上下文',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '运行中的任务列表',
  })
  getRunningTasks(): any[] {
    const contexts = this.orchestratorService.getRunningContexts();
    return contexts.map((ctx) => ({
      taskRunId: ctx.taskRunId,
      taskId: ctx.taskId,
      deviceId: ctx.deviceId,
      currentState: ctx.currentState,
      stats: ctx.stats,
      packageName: ctx.packageName,
    }));
  }

  /**
   * 查询任务运行详情
   */
  @Get('task-runs/:taskRunId')
  @ApiOperation({
    summary: '查询任务运行详情',
    description: '获取任务运行的详细信息，包括状态、事件、统计数据',
  })
  @ApiParam({
    name: 'taskRunId',
    type: String,
    description: '任务运行ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '任务运行详情',
  })
  async getTaskRun(
    @Param('taskRunId', ParseUUIDPipe) taskRunId: string,
  ): Promise<any> {
    return this.taskRunService.getTaskRun(taskRunId);
  }

  /**
   * 查询任务的所有运行记录
   */
  @Get('tasks/:taskId/runs')
  @ApiOperation({
    summary: '查询任务的所有运行记录',
    description: '获取指定任务的所有历史运行记录',
  })
  @ApiParam({
    name: 'taskId',
    type: String,
    description: '任务ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '任务运行记录列表',
  })
  async getTaskRuns(
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<any[]> {
    return this.taskRunService.getTaskRunsByTask(taskId);
  }
}

