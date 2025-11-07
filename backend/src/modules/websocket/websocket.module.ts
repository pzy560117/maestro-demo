import { Module, Global } from '@nestjs/common';
import { EventsGateway } from './websocket.gateway';

/**
 * WebSocket 模块
 * 全局模块，提供实时推送能力
 */
@Global()
@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class WebSocketModule {}
