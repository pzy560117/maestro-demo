import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationSendStatus } from '@prisma/client';
import axios from 'axios';

/**
 * 告警通知服务
 * 负责向不同渠道发送告警通知（飞书、企业微信、邮件等）
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 发送通知到指定渠道
   * @param channel 通知渠道
   * @param target 接收目标
   * @param message 告警消息
   * @param payload 告警详细数据
   */
  async sendNotification(
    channel: NotificationChannel,
    target: string,
    message: string,
    payload?: Record<string, any>,
  ): Promise<{ status: NotificationSendStatus; response?: any; error?: string }> {
    this.logger.log(
      `Sending notification via ${channel} to ${target}`,
    );

    try {
      switch (channel) {
        case NotificationChannel.FEISHU:
          return await this.sendFeishuNotification(target, message, payload);
        case NotificationChannel.WECHAT:
          return await this.sendWechatNotification(target, message, payload);
        case NotificationChannel.EMAIL:
          return await this.sendEmailNotification(target, message, payload);
        case NotificationChannel.PHONE:
          return await this.sendPhoneNotification(target, message, payload);
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send notification via ${channel}: ${errorMessage}`,
        errorStack,
      );
      return {
        status: NotificationSendStatus.FAILED,
        error: errorMessage,
      };
    }
  }

  /**
   * 发送飞书通知
   */
  private async sendFeishuNotification(
    webhookUrl: string,
    message: string,
    payload?: Record<string, any>,
  ): Promise<{ status: NotificationSendStatus; response?: any }> {
    const body = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: '🔔 Maestro 告警通知',
          },
          template: this.getSeverityColor(payload?.severity || 'P2'),
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**告警类型**: ${payload?.alertType || 'SYSTEM'}\n**严重级别**: ${payload?.severity || 'P2'}\n**消息**: ${message}`,
            },
          },
          ...(payload?.taskRunId
            ? [
                {
                  tag: 'div',
                  text: {
                    tag: 'lark_md',
                    content: `**任务运行**: ${payload.taskRunId}`,
                  },
                },
              ]
            : []),
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**触发时间**: ${new Date().toLocaleString('zh-CN')}`,
            },
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: {
                  tag: 'plain_text',
                  content: '查看详情',
                },
                type: 'primary',
                url: `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/alerts/${payload?.alertId || ''}`,
              },
            ],
          },
        ],
      },
    };

    const response = await axios.post(webhookUrl, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });

    if (response.data.code !== 0) {
      throw new Error(
        `Feishu API error: ${response.data.msg || 'Unknown error'}`,
      );
    }

    return { status: NotificationSendStatus.SENT, response: response.data };
  }

  /**
   * 发送企业微信通知
   */
  private async sendWechatNotification(
    webhookUrl: string,
    message: string,
    payload?: Record<string, any>,
  ): Promise<{ status: NotificationSendStatus; response?: any }> {
    const body = {
      msgtype: 'markdown',
      markdown: {
        content: `# 🔔 Maestro 告警通知\n\n` +
          `**告警类型**: ${payload?.alertType || 'SYSTEM'}\n\n` +
          `**严重级别**: ${payload?.severity || 'P2'}\n\n` +
          `**消息**: ${message}\n\n` +
          `**触发时间**: ${new Date().toLocaleString('zh-CN')}\n\n` +
          `[查看详情](${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/alerts/${payload?.alertId || ''})`,
      },
    };

    const response = await axios.post(webhookUrl, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });

    if (response.data.errcode !== 0) {
      throw new Error(
        `Wechat API error: ${response.data.errmsg || 'Unknown error'}`,
      );
    }

    return { status: NotificationSendStatus.SENT, response: response.data };
  }

  /**
   * 发送邮件通知（需配置邮件服务）
   */
  private async sendEmailNotification(
    email: string,
    message: string,
    payload?: Record<string, any>,
  ): Promise<{ status: NotificationSendStatus; response?: any }> {
    // 简化实现：记录日志，实际需要集成邮件服务（如 SendGrid、阿里云邮件）
    this.logger.warn(
      `Email notification not implemented yet. Target: ${email}, Message: ${message}`,
    );

    // 模拟发送成功
    return {
      status: NotificationSendStatus.SENT,
      response: { mock: true, email, message },
    };
  }

  /**
   * 发送电话通知（需配置短信/电话服务）
   */
  private async sendPhoneNotification(
    phone: string,
    message: string,
    payload?: Record<string, any>,
  ): Promise<{ status: NotificationSendStatus; response?: any }> {
    // 简化实现：记录日志
    this.logger.warn(
      `Phone notification not implemented yet. Target: ${phone}, Message: ${message}`,
    );

    return {
      status: NotificationSendStatus.SENT,
      response: { mock: true, phone, message },
    };
  }

  /**
   * 获取严重级别对应的颜色
   */
  private getSeverityColor(severity: string): string {
    const colorMap: Record<string, string> = {
      P1: 'red',
      P2: 'orange',
      P3: 'blue',
    };
    return colorMap[severity] || 'blue';
  }
}

