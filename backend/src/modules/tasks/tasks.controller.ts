import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { TaskStatus } from '@prisma/client';

/**
 * 任务管理控制器
 * 实现功能 B：遍历任务创建与管理（FR-01）
 * 
 * 遵循 REST API 规范：
 * - POST /tasks - 创建任务
 * - GET /tasks - 查询任务列表
 * - GET /tasks/:id - 查询任务详情
 * - PATCH /tasks/:id - 更新任务
 * - DELETE /tasks/:id - 删除任务
 * - POST /tasks/:id/cancel - 取消任务
 */
@ApiTags('Tasks - 任务管理')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * 创建遍历任务
   * 
   * 验收标准：
   * - API POST /tasks 返回 201 + 任务 ID
   * - 创建成功后状态为 QUEUED
   * - 未选择设备时返回 400
   * - 设备正忙时返回 400
   */
  @Post()
  @ApiOperation({
    summary: '创建遍历任务',
    description: '创建新的UI自动化遍历任务，验证设备可用性后进入排队状态',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '任务创建成功',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数错误、设备不可用或设备正忙',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '应用版本或设备不存在',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTaskDto: CreateTaskDto): Promise<TaskResponseDto> {
    return this.tasksService.create(createTaskDto);
  }

  /**
   * 获取任务统计信息
   */
  @Get('stats')
  @ApiOperation({
    summary: '获取任务统计信息',
    description: '获取任务的统计数据，包括运行中、成功、失败等各状态的任务数量',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '任务统计信息',
  })
  async getStats(): Promise<{
    total: number;
    running: number;
    queued: number;
    succeeded: number;
    failed: number;
    cancelled: number;
  }> {
    return this.tasksService.getStats();
  }

  /**
   * 获取待执行任务队列（供 Orchestrator 使用）
   */
  @Get('queue/pending')
  @ApiOperation({
    summary: '获取待执行任务队列',
    description: '供 Orchestrator 调度器使用，获取优先级排序的待执行任务',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: '返回任务数量（默认10）',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '待执行任务列表',
    type: TaskResponseDto,
    isArray: true,
  })
  async getPendingTasks(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<TaskResponseDto[]> {
    return this.tasksService.getPendingTasks(limit);
  }

  /**
   * 查询任务列表（支持筛选和分页）
   */
  @Get()
  @ApiOperation({
    summary: '查询任务列表',
    description: '获取所有遍历任务，支持按状态、应用版本筛选和分页',
  })
  @ApiQuery({
    name: 'status',
    enum: TaskStatus,
    required: false,
    description: '任务状态筛选',
  })
  @ApiQuery({
    name: 'appVersionId',
    type: String,
    required: false,
    description: '应用版本ID筛选',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: '页码（默认1）',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: '每页数量（默认20）',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '任务列表（分页）',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/TaskResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findAll(
    @Query('status') status?: TaskStatus,
    @Query('appVersionId') appVersionId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    items: TaskResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.tasksService.findAll({
      status,
      appVersionId,
      page,
      limit,
    });
  }

  /**
   * 查询任务详情
   */
  @Get(':id')
  @ApiOperation({
    summary: '查询任务详情',
    description: '根据任务ID获取详细信息，包括关联的应用版本信息',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: '任务ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '任务详情',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '任务不存在',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.findOne(id);
  }

  /**
   * 更新任务
   */
  @Patch(':id')
  @ApiOperation({
    summary: '更新任务',
    description: '更新任务配置，仅允许更新未执行的任务',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: '任务ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '任务更新成功',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '任务状态不允许修改',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '任务不存在',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(id, updateTaskDto);
  }

  /**
   * 删除任务
   */
  @Delete(':id')
  @ApiOperation({
    summary: '删除任务',
    description: '删除任务记录，仅允许删除已完成或失败的任务',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: '任务ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '任务删除成功',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '任务状态不允许删除',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '任务不存在',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tasksService.remove(id);
  }

  /**
   * 取消任务
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '取消任务',
    description: '取消正在排队或执行中的任务',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: '任务ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '任务取消成功',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '任务状态不允许取消',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '任务不存在',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.cancel(id);
  }
}

