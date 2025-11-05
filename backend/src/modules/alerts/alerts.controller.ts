import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import {
  CreateAlertDto,
  AcknowledgeAlertDto,
  QueryAlertDto,
  SendNotificationDto,
} from './dto';

/**
 * 告警管理控制器
 * 提供告警CRUD、确认、通知等API
 */
@ApiTags('Alerts - 告警管理')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /**
   * 创建告警
   */
  @Post()
  @ApiOperation({
    summary: '创建告警',
    description: '创建新的告警记录，支持关联任务、界面、元素',
  })
  @ApiResponse({
    status: 201,
    description: '告警创建成功',
  })
  async create(@Body() createAlertDto: CreateAlertDto) {
    const alert = await this.alertsService.create(createAlertDto);
    return {
      code: 0,
      message: '告警创建成功',
      data: alert,
      traceId: `alert-${Date.now()}`,
    };
  }

  /**
   * 查询告警列表
   */
  @Get()
  @ApiOperation({
    summary: '查询告警列表',
    description: '支持按类型、级别、状态、时间范围过滤，分页返回',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  async findAll(@Query() query: QueryAlertDto) {
    const result = await this.alertsService.findAll(query);
    return {
      code: 0,
      message: '查询成功',
      data: {
        items: result.items,
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      },
      traceId: `alert-list-${Date.now()}`,
    };
  }

  /**
   * 获取告警统计
   */
  @Get('stats')
  @ApiOperation({
    summary: '获取告警统计',
    description: '按严重级别、类型、状态统计告警数量',
  })
  @ApiQuery({
    name: 'startTime',
    required: false,
    description: '开始时间（ISO 8601）',
  })
  @ApiQuery({
    name: 'endTime',
    required: false,
    description: '结束时间（ISO 8601）',
  })
  @ApiResponse({
    status: 200,
    description: '统计成功',
  })
  async getStatistics(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    const timeRange =
      startTime && endTime ? { startTime, endTime } : undefined;
    const stats = await this.alertsService.getStatistics(timeRange);
    return {
      code: 0,
      message: '统计成功',
      data: stats,
      traceId: `alert-stats-${Date.now()}`,
    };
  }

  /**
   * 获取告警详情
   */
  @Get(':id')
  @ApiOperation({
    summary: '获取告警详情',
    description: '获取单个告警的完整信息，包含关联的任务、界面、元素、通知记录',
  })
  @ApiParam({
    name: 'id',
    description: '告警ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  @ApiResponse({
    status: 404,
    description: '告警不存在',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const alert = await this.alertsService.findOne(id);
    return {
      code: 0,
      message: '查询成功',
      data: alert,
      traceId: `alert-${id}-${Date.now()}`,
    };
  }

  /**
   * 确认告警
   */
  @Patch(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '确认告警',
    description: '确认告警，状态变更为ACKED',
  })
  @ApiParam({
    name: 'id',
    description: '告警ID',
  })
  @ApiResponse({
    status: 200,
    description: '确认成功',
  })
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() ackDto: AcknowledgeAlertDto,
  ) {
    const alert = await this.alertsService.acknowledge(id, ackDto);
    return {
      code: 0,
      message: '告警已确认',
      data: alert,
      traceId: `alert-ack-${id}-${Date.now()}`,
    };
  }

  /**
   * 解决告警
   */
  @Patch(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '解决告警',
    description: '将告警标记为已解决',
  })
  @ApiParam({
    name: 'id',
    description: '告警ID',
  })
  @ApiResponse({
    status: 200,
    description: '解决成功',
  })
  async resolve(@Param('id', ParseUUIDPipe) id: string) {
    const alert = await this.alertsService.resolve(id);
    return {
      code: 0,
      message: '告警已解决',
      data: alert,
      traceId: `alert-resolve-${id}-${Date.now()}`,
    };
  }

  /**
   * 发送通知
   */
  @Post('notifications')
  @ApiOperation({
    summary: '发送告警通知',
    description: '手动发送告警通知到指定渠道',
  })
  @ApiResponse({
    status: 201,
    description: '通知发送成功',
  })
  async sendNotification(@Body() sendDto: SendNotificationDto) {
    const result = await this.alertsService.sendNotification(sendDto);
    return {
      code: result.success ? 0 : 1,
      message: result.success ? '通知发送成功' : '通知发送失败',
      data: {
        notificationId: result.notificationId,
        error: result.error,
      },
      traceId: `notification-${Date.now()}`,
    };
  }
}

