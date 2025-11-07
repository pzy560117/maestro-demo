import { IsEnum, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';

/**
 * 发送通知DTO
 */
export class SendNotificationDto {
  @ApiProperty({
    description: '告警ID',
    example: 'alert-uuid',
  })
  @IsUUID()
  alertId!: string;

  @ApiProperty({
    description: '通知渠道',
    enum: NotificationChannel,
    example: 'FEISHU',
  })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiProperty({
    description: '接收目标（飞书WebhookURL、邮箱等）',
    example: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
  })
  @IsString()
  target!: string;
}
