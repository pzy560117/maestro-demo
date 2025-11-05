import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { LlmService } from './llm.service';
import { LlmAuditService } from './services/llm-audit.service';
import { LlmRequest, AllowedActionType } from './types/llm.types';
import { QueryLlmLogsDto } from './dto/query-llm-logs.dto';

/**
 * LLM 控制器
 * 提供 LLM 指令生成和审计日志查询接口
 * Iteration 3: 增强审计日志功能（FR-13）
 */
@ApiTags('LLM - 大模型服务')
@Controller('llm')
export class LlmController {
  constructor(
    private readonly llmService: LlmService,
    private readonly llmAuditService: LlmAuditService,
  ) {}

  /**
   * 生成动作指令
   */
  @Post('generate-action')
  @ApiOperation({
    summary: '生成动作指令',
    description: '调用 LLM 分析界面并生成下一步动作，经过安全校验后返回',
  })
  @ApiBody({
    description: 'LLM 请求参数',
    schema: {
      type: 'object',
      properties: {
        taskRunId: { type: 'string', example: 'task-run-uuid' },
        screenId: { type: 'string', example: 'screen-uuid' },
        screenshotPath: { type: 'string', example: '/screenshots/screen1.png' },
        domJson: { type: 'object' },
        historyActions: { type: 'array' },
        allowedActions: {
          type: 'array',
          items: { type: 'string' },
          example: ['CLICK', 'INPUT', 'SCROLL'],
        },
      },
      required: ['taskRunId', 'screenshotPath', 'allowedActions'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '动作计划生成成功',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  async generateAction(@Body() request: LlmRequest): Promise<any> {
    return this.llmService.generateAction(request);
  }

  /**
   * 查询 LLM 日志
   */
  @Get('logs/:taskRunId')
  @ApiOperation({
    summary: '查询 LLM 日志',
    description: '获取指定任务运行的 LLM 调用日志',
  })
  @ApiParam({
    name: 'taskRunId',
    type: String,
    description: '任务运行ID',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: '返回日志数量（默认100）',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'LLM 日志列表',
  })
  async getLlmLogs(
    @Param('taskRunId', ParseUUIDPipe) taskRunId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<any[]> {
    return this.llmService.getLlmLogs(taskRunId, limit);
  }

  /**
   * 审计日志查询（高级）
   * Iteration 3: 功能 J - LLM 审计日志
   */
  @Get('audit/logs')
  @ApiOperation({
    summary: '查询 LLM 审计日志',
    description: '支持多条件过滤、分页查询 LLM 调用日志',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '审计日志列表',
  })
  async queryAuditLogs(@Query() query: QueryLlmLogsDto) {
    const result = await this.llmAuditService.queryLogs(query);
    return {
      code: 0,
      message: '查询成功',
      data: result.items,
      pagination: result.pagination,
      traceId: `llm-audit-${Date.now()}`,
    };
  }

  /**
   * 获取日志详情
   */
  @Get('audit/logs/:id')
  @ApiOperation({
    summary: '获取 LLM 日志详情',
    description: '获取单条 LLM 日志的完整信息，包含请求/响应详情',
  })
  @ApiParam({
    name: 'id',
    description: '日志ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '日志详情',
  })
  async getLogDetail(@Param('id', ParseUUIDPipe) id: string) {
    const log = await this.llmAuditService.getLogDetail(id);
    return {
      code: 0,
      message: '查询成功',
      data: log,
      traceId: `llm-log-${id}-${Date.now()}`,
    };
  }

  /**
   * 获取思维链
   */
  @Get('audit/logs/:id/thinking')
  @ApiOperation({
    summary: '获取 LLM 思维链',
    description: '提取 LLM 的推理过程和思考步骤',
  })
  @ApiParam({
    name: 'id',
    description: '日志ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '思维链数据',
  })
  async getThinkingChain(@Param('id', ParseUUIDPipe) id: string) {
    const chain = await this.llmAuditService.getThinkingChain(id);
    return {
      code: 0,
      message: '查询成功',
      data: chain,
      traceId: `llm-thinking-${id}-${Date.now()}`,
    };
  }

  /**
   * 获取统计数据
   */
  @Get('audit/statistics')
  @ApiOperation({
    summary: '获取 LLM 调用统计',
    description: '统计总调用次数、错误率、平均延迟、Token 消耗等',
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
    status: HttpStatus.OK,
    description: '统计数据',
  })
  async getStatistics(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    const timeRange =
      startTime && endTime ? { startTime, endTime } : undefined;
    const stats = await this.llmAuditService.getStatistics(timeRange);
    return {
      code: 0,
      message: '统计成功',
      data: stats,
      traceId: `llm-stats-${Date.now()}`,
    };
  }

  /**
   * 导出日志
   */
  @Post('audit/export')
  @ApiOperation({
    summary: '导出 LLM 日志',
    description: '导出符合条件的 LLM 日志到文件（JSON/CSV）',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filters: { type: 'object', description: '查询条件' },
        format: {
          type: 'string',
          enum: ['json', 'csv'],
          default: 'json',
          description: '导出格式',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '导出成功',
  })
  async exportLogs(
    @Body('filters') filters: QueryLlmLogsDto,
    @Body('format') format: 'json' | 'csv' = 'json',
  ) {
    const result = await this.llmAuditService.exportLogs(filters, format);
    return {
      code: 0,
      message: '导出成功',
      data: result,
      traceId: `llm-export-${Date.now()}`,
    };
  }

  /**
   * 清理过期日志
   */
  @Post('audit/cleanup')
  @ApiOperation({
    summary: '清理过期日志',
    description: '删除超过 180 天的 LLM 日志',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '清理成功',
  })
  async cleanupLogs() {
    const result = await this.llmAuditService.cleanupExpiredLogs();
    return {
      code: 0,
      message: '清理成功',
      data: result,
      traceId: `llm-cleanup-${Date.now()}`,
    };
  }
}

