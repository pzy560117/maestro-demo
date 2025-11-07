import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from './services/notification.service';
import { EventsGateway } from '../websocket/websocket.gateway';
import { CreateAlertDto, AcknowledgeAlertDto, QueryAlertDto, SendNotificationDto } from './dto';
import { Alert, AlertStatus, AlertSeverity, Prisma } from '@prisma/client';

/**
 * 告警服务
 * 负责告警的创建、查询、确认和通知发送
 * 符合FR-12告警通知与确认流程
 */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly wsGateway: EventsGateway,
  ) {}

  /**
   * 创建告警
   * 验收标准：告警触发 → 写入 alerts
   */
  async create(createAlertDto: CreateAlertDto): Promise<Alert> {
    this.logger.log(`Creating alert: ${createAlertDto.alertType} - ${createAlertDto.message}`);

    const alert = await this.prisma.alert.create({
      data: {
        taskRunId: createAlertDto.taskRunId,
        screenId: createAlertDto.screenId,
        elementId: createAlertDto.elementId,
        alertType: createAlertDto.alertType,
        severity: createAlertDto.severity,
        message: createAlertDto.message,
        payload: createAlertDto.payload as Prisma.InputJsonValue,
        status: AlertStatus.OPEN,
      },
      include: {
        taskRun: {
          select: {
            id: true,
            task: {
              select: {
                name: true,
              },
            },
          },
        },
        screen: {
          select: {
            id: true,
            signature: true,
          },
        },
        element: {
          select: {
            id: true,
            elementType: true,
            resourceId: true,
          },
        },
      },
    });

    this.logger.log(`Alert created: ${alert.id}`);

    // 推送 WebSocket 告警创建事件
    this.wsGateway.emitAlert({
      id: alert.id,
      alertType: alert.alertType,
      severity: alert.severity,
      message: alert.message,
      status: alert.status,
      taskRunId: alert.taskRunId,
    });

    // 触发自动通知（异步）
    this.triggerAutoNotification(alert).catch((err) => {
      this.logger.error(`Auto notification failed: ${err.message}`, err.stack);
    });

    return alert;
  }

  /**
   * 查询告警列表（带分页和过滤）
   */
  async findAll(query: QueryAlertDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Prisma.AlertWhereInput = {};
    if (filters.alertType) where.alertType = filters.alertType;
    if (filters.severity) where.severity = filters.severity;
    if (filters.status) where.status = filters.status;
    if (filters.taskRunId) where.taskRunId = filters.taskRunId;
    if (filters.startTime || filters.endTime) {
      where.triggeredAt = {};
      if (filters.startTime) {
        where.triggeredAt.gte = new Date(filters.startTime);
      }
      if (filters.endTime) {
        where.triggeredAt.lte = new Date(filters.endTime);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ severity: 'asc' }, { triggeredAt: 'desc' }],
        include: {
          taskRun: {
            select: {
              id: true,
              task: { select: { name: true } },
            },
          },
          notifications: {
            select: {
              id: true,
              channel: true,
              sendStatus: true,
              sentAt: true,
            },
          },
        },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取单个告警详情
   */
  async findOne(id: string): Promise<Alert> {
    const alert = await this.prisma.alert.findUnique({
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
        element: {
          select: {
            id: true,
            elementType: true,
            resourceId: true,
            textValue: true,
          },
        },
        notifications: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    return alert;
  }

  /**
   * 确认告警
   * 验收标准：确认后状态变为 ACKED
   */
  async acknowledge(id: string, ackDto: AcknowledgeAlertDto): Promise<Alert> {
    this.logger.log(`Acknowledging alert: ${id}`);

    const alert = await this.prisma.alert.update({
      where: { id },
      data: {
        status: AlertStatus.ACKED,
        ackBy: ackDto.ackBy,
        ackAt: new Date(),
      },
    });

    this.logger.log(`Alert acknowledged: ${id} by ${ackDto.ackBy || 'system'}`);

    // 推送 WebSocket 告警状态更新事件
    this.wsGateway.emitAlertUpdate(id, AlertStatus.ACKED);

    return alert;
  }

  /**
   * 解决告警
   */
  async resolve(id: string): Promise<Alert> {
    this.logger.log(`Resolving alert: ${id}`);

    const alert = await this.prisma.alert.update({
      where: { id },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    this.logger.log(`Alert resolved: ${id}`);

    // 推送 WebSocket 告警状态更新事件
    this.wsGateway.emitAlertUpdate(id, AlertStatus.RESOLVED);

    return alert;
  }

  /**
   * 发送通知
   * 验收标准：P1 告警 1 分钟内发出通知
   */
  async sendNotification(
    sendDto: SendNotificationDto,
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    const { alertId, channel, target } = sendDto;

    // 获取告警详情
    const alert = await this.findOne(alertId);

    // 构建通知消息
    const message = alert.message;
    const payload = {
      ...((alert.payload as Record<string, any>) || {}),
      alertId: alert.id,
      alertType: alert.alertType,
      severity: alert.severity,
      taskRunId: alert.taskRunId,
    };

    // 发送通知
    const result = await this.notificationService.sendNotification(
      channel,
      target,
      message,
      payload,
    );

    // 保存通知记录
    const notification = await this.prisma.alertNotification.create({
      data: {
        alertId,
        channel,
        target,
        sendStatus: result.status,
        responsePayload: result.response as Prisma.InputJsonValue,
        sentAt: result.status === 'SENT' ? new Date() : null,
      },
    });

    return {
      success: result.status === 'SENT',
      notificationId: notification.id,
      error: result.error,
    };
  }

  /**
   * 获取告警统计
   */
  async getStatistics(timeRange?: { startTime: string; endTime: string }) {
    const where: Prisma.AlertWhereInput = {};
    if (timeRange) {
      where.triggeredAt = {
        gte: new Date(timeRange.startTime),
        lte: new Date(timeRange.endTime),
      };
    }

    const [total, pending, acked, resolved, critical, bySeverity, byType] = await Promise.all([
      this.prisma.alert.count({ where }),
      this.prisma.alert.count({ where: { ...where, status: AlertStatus.OPEN } }),
      this.prisma.alert.count({ where: { ...where, status: AlertStatus.ACKED } }),
      this.prisma.alert.count({ where: { ...where, status: AlertStatus.RESOLVED } }),
      this.prisma.alert.count({ where: { ...where, severity: AlertSeverity.P1 } }),
      this.prisma.alert.groupBy({
        by: ['severity'],
        where,
        _count: { severity: true },
      }),
      this.prisma.alert.groupBy({
        by: ['alertType'],
        where,
        _count: { alertType: true },
      }),
    ]);

    return {
      total,
      pending,
      acked,
      resolved,
      critical,
      bySeverity: bySeverity.reduce(
        (acc, item) => {
          acc[item.severity] = item._count.severity;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byType: byType.reduce(
        (acc, item) => {
          acc[item.alertType] = item._count.alertType;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  /**
   * 自动触发通知
   * 根据告警级别和配置自动发送通知
   */
  private async triggerAutoNotification(alert: Alert): Promise<void> {
    // 获取告警通知配置
    const config = await this.getNotificationConfig(alert.severity);
    if (!config || !config.enabled) {
      this.logger.debug(`Auto notification disabled for severity: ${alert.severity}`);
      return;
    }

    // 发送到所有配置的渠道
    for (const target of config.targets) {
      try {
        await this.sendNotification({
          alertId: alert.id,
          channel: target.channel,
          target: target.address,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Auto notification failed for ${target.channel}: ${errorMessage}`,
          errorStack,
        );
      }
    }
  }

  /**
   * 获取告警通知配置
   * 从数据库或配置中心读取
   */
  private async getNotificationConfig(severity: string): Promise<{
    enabled: boolean;
    targets: Array<{ channel: any; address: string }>;
  } | null> {
    // 简化实现：从环境变量或数据库读取配置
    // 实际应从 integration_configs 表读取
    const configs = await this.prisma.integrationConfig.findMany({
      where: {
        configType: 'ALERT_CHANNEL',
        enabled: true,
      },
    });

    if (configs.length === 0) {
      return null;
    }

    // 根据严重级别过滤配置
    const targets: Array<{ channel: any; address: string }> = [];
    for (const config of configs) {
      const configData = config.config as any;
      if (!configData.severities || configData.severities.includes(severity)) {
        targets.push({
          channel: configData.channel,
          address: configData.target,
        });
      }
    }

    return {
      enabled: targets.length > 0,
      targets,
    };
  }
}
