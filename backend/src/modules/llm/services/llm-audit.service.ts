import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { QueryLlmLogsDto } from '../dto/query-llm-logs.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * LLM 审计日志服务
 * 实现功能 J：LLM 审计日志（FR-13, Iteration 3）
 * 
 * 验收标准：
 * 1. llm_logs 含 request/response JSON、tokens、latency
 * 2. 支持下载指定时间范围日志
 * 3. 日志保留 180 天
 */
@Injectable()
export class LlmAuditService {
  private readonly logger = new Logger(LlmAuditService.name);
  private readonly AUDIT_LOG_RETENTION_DAYS = 180;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询 LLM 日志（带分页和过滤）
   * 验收标准 1: 返回完整的请求/响应、tokens、latency
   */
  async queryLogs(query: QueryLlmLogsDto) {
    const { page = 1, pageSize = 50, ...filters } = query;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Prisma.LlmLogWhereInput = {};
    if (filters.taskRunId) where.taskRunId = filters.taskRunId;
    if (filters.screenId) where.screenId = filters.screenId;
    if (filters.modelName) where.modelName = filters.modelName;
    if (filters.hasError) {
      where.errorCode = { not: null };
    }
    if (filters.startTime || filters.endTime) {
      where.createdAt = {};
      if (filters.startTime) {
        where.createdAt.gte = new Date(filters.startTime);
      }
      if (filters.endTime) {
        where.createdAt.lte = new Date(filters.endTime);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.llmLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          taskRun: {
            select: {
              id: true,
              task: { select: { name: true } },
            },
          },
          screen: {
            select: {
              id: true,
              signature: true,
              primaryText: true,
            },
          },
        },
      }),
      this.prisma.llmLog.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取单条 LLM 日志详情
   */
  async getLogDetail(id: string) {
    const log = await this.prisma.llmLog.findUnique({
      where: { id },
      include: {
        taskRun: {
          select: {
            id: true,
            status: true,
            task: { select: { name: true, appVersion: true } },
          },
        },
        screen: {
          select: {
            id: true,
            signature: true,
            screenshotPath: true,
            primaryText: true,
          },
        },
        taskActions: {
          select: {
            id: true,
            actionType: true,
            params: true,
            status: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException(`LLM log with ID ${id} not found`);
    }

    return log;
  }

  /**
   * 获取 LLM 调用统计
   */
  async getStatistics(timeRange?: { startTime: string; endTime: string }) {
    const where: Prisma.LlmLogWhereInput = {};
    if (timeRange) {
      where.createdAt = {
        gte: new Date(timeRange.startTime),
        lte: new Date(timeRange.endTime),
      };
    }

    const [
      total,
      byModel,
      errorCount,
      avgLatency,
      totalTokens,
    ] = await Promise.all([
      this.prisma.llmLog.count({ where }),
      this.prisma.llmLog.groupBy({
        by: ['modelName'],
        where,
        _count: { modelName: true },
      }),
      this.prisma.llmLog.count({
        where: { ...where, errorCode: { not: null } },
      }),
      this.prisma.llmLog.aggregate({
        where,
        _avg: { latencyMs: true },
      }),
      this.prisma.llmLog.aggregate({
        where,
        _sum: {
          promptTokens: true,
          completionTokens: true,
        },
      }),
    ]);

    return {
      total,
      errorCount,
      errorRate: total > 0 ? (errorCount / total) * 100 : 0,
      avgLatencyMs: avgLatency._avg.latencyMs || 0,
      totalPromptTokens: totalTokens._sum.promptTokens || 0,
      totalCompletionTokens: totalTokens._sum.completionTokens || 0,
      totalTokens:
        (totalTokens._sum.promptTokens || 0) +
        (totalTokens._sum.completionTokens || 0),
      byModel: byModel.reduce((acc, item) => {
        acc[item.modelName] = item._count.modelName;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * 导出日志（支持 JSON/CSV 格式）
   * 验收标准 2: 支持下载指定时间范围日志
   */
  async exportLogs(
    query: QueryLlmLogsDto,
    format: 'json' | 'csv' = 'json',
  ): Promise<{ filePath: string; recordCount: number }> {
    const { items } = await this.queryLogs({
      ...query,
      pageSize: 10000, // 导出上限
    });

    // 生成导出文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `llm-logs-export-${timestamp}.${format}`;
    const exportDir = path.join(process.cwd(), 'exports', 'llm-logs');
    const filePath = path.join(exportDir, fileName);

    // 确保目录存在
    await fs.mkdir(exportDir, { recursive: true });

    if (format === 'json') {
      await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf-8');
    } else if (format === 'csv') {
      const csv = this.convertToCSV(items);
      await fs.writeFile(filePath, csv, 'utf-8');
    }

    this.logger.log(
      `Exported ${items.length} LLM logs to ${filePath}`,
    );

    return {
      filePath,
      recordCount: items.length,
    };
  }

  /**
   * 清理过期日志
   * 验收标准 3: 日志保留 180 天
   */
  async cleanupExpiredLogs(): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.AUDIT_LOG_RETENTION_DAYS);

    const result = await this.prisma.llmLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} LLM logs older than ${this.AUDIT_LOG_RETENTION_DAYS} days`,
    );

    return { deletedCount: result.count };
  }

  /**
   * 获取思维链（Chain of Thought）
   * 从响应中提取 LLM 的推理过程
   */
  async getThinkingChain(logId: string): Promise<{
    logId: string;
    thinking: string[];
    action: any;
    reasoning: string;
  }> {
    const log = await this.getLogDetail(logId);

    const response = log.responsePayload as any;
    const thinking = response?.thinking || [];
    const action = response?.action || {};
    const reasoning = response?.reasoning || '';

    return {
      logId: log.id,
      thinking,
      action,
      reasoning,
    };
  }

  /**
   * 转换为 CSV 格式
   */
  private convertToCSV(logs: any[]): string {
    if (logs.length === 0) return '';

    // CSV 表头
    const headers = [
      'ID',
      'Task Run ID',
      'Screen ID',
      'Model Name',
      'Prompt Tokens',
      'Completion Tokens',
      'Latency (ms)',
      'Error Code',
      'Cost',
      'Created At',
    ];

    // CSV 行
    const rows = logs.map((log) => [
      log.id,
      log.taskRunId || '',
      log.screenId || '',
      log.modelName,
      log.promptTokens,
      log.completionTokens,
      log.latencyMs,
      log.errorCode || '',
      log.cost || '',
      log.createdAt,
    ]);

    // 组合为 CSV
    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(','),
      ),
    ];

    return csvLines.join('\n');
  }
}

