import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * WebSocket 网关
 * 负责实时推送任务状态、告警通知等事件
 * 支持 Socket.IO 协议
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  /**
   * 网关初始化
   */
  afterInit(server: Server): void {
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * 客户端连接
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * 客户端断开连接
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * 广播任务状态更新
   * @param taskId 任务ID
   * @param status 任务状态
   * @param data 附加数据
   */
  emitTaskUpdate(taskId: string, status: string, data?: any): void {
    this.server.emit('task:update', {
      taskId,
      status,
      timestamp: new Date().toISOString(),
      ...data,
    });
    this.logger.debug(`Task update emitted: ${taskId} -> ${status}`);
  }

  /**
   * 广播告警通知
   * @param alert 告警数据
   */
  emitAlert(alert: any): void {
    this.server.emit('alert:new', {
      alert,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Alert emitted: ${alert.id} (${alert.severity})`);
  }

  /**
   * 广播告警状态更新
   * @param alertId 告警ID
   * @param status 告警状态
   */
  emitAlertUpdate(alertId: string, status: string): void {
    this.server.emit('alert:update', {
      alertId,
      status,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Alert update emitted: ${alertId} -> ${status}`);
  }

  /**
   * 广播任务运行记录更新
   * @param taskRunId 任务运行ID
   * @param data 运行数据
   */
  emitTaskRunUpdate(taskRunId: string, data: any): void {
    this.server.emit('taskrun:update', {
      taskRunId,
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Task run update emitted: ${taskRunId}`);
  }

  /**
   * 向特定房间发送消息
   * @param room 房间名称
   * @param event 事件名称
   * @param data 数据
   */
  emitToRoom(room: string, event: string, data: any): void {
    this.server.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Event emitted to room ${room}: ${event}`);
  }
}
