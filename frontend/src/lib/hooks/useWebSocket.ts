import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { logger } from '@/lib/utils/logger';

/**
 * WebSocket 连接状态
 */
export enum WebSocketStatus {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
}

/**
 * WebSocket 事件类型
 */
export interface WebSocketEvents {
  'task:update': (data: TaskUpdateEvent) => void;
  'alert:new': (data: AlertNewEvent) => void;
  'alert:update': (data: AlertUpdateEvent) => void;
  'taskrun:update': (data: TaskRunUpdateEvent) => void;
}

/**
 * 任务更新事件
 */
export interface TaskUpdateEvent {
  taskId: string;
  status: string;
  timestamp: string;
  name?: string;
  appVersion?: string;
  deviceCount?: number;
  cancelled?: boolean;
}

/**
 * 告警创建事件
 */
export interface AlertNewEvent {
  alert: {
    id: string;
    alertType: string;
    severity: string;
    message: string;
    status: string;
    taskRunId?: string;
  };
  timestamp: string;
}

/**
 * 告警更新事件
 */
export interface AlertUpdateEvent {
  alertId: string;
  status: string;
  timestamp: string;
}

/**
 * 任务运行更新事件
 */
export interface TaskRunUpdateEvent {
  taskRunId: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * WebSocket Hook 配置
 */
export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionDelay?: number;
  reconnectionAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * WebSocket Hook
 * 用于管理 Socket.io 连接和事件监听
 * 
 * @example
 * ```tsx
 * const { socket, status, connect, disconnect, on } = useWebSocket({
 *   autoConnect: true,
 *   onConnect: () => console.log('Connected'),
 * });
 * 
 * useEffect(() => {
 *   const unsubscribe = on('task:update', (data) => {
 *     console.log('Task updated:', data);
 *   });
 *   return unsubscribe;
 * }, [on]);
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = import.meta.env.VITE_WS_URL || 'http://localhost:3000/events',
    autoConnect = true,
    reconnection = true,
    reconnectionDelay = 1000,
    reconnectionAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const statusRef = useRef<WebSocketStatus>(WebSocketStatus.Disconnected);

  /**
   * 连接 WebSocket
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      logger.debug('WebSocket already connected', { module: 'WebSocket' });
      return;
    }

    logger.debug('Connecting to WebSocket', {
      module: 'WebSocket',
      data: { url, reconnection, reconnectionDelay, reconnectionAttempts },
    });
    statusRef.current = WebSocketStatus.Connecting;

    const socket = io(url, {
      reconnection,
      reconnectionDelay,
      reconnectionAttempts,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      logger.info('WebSocket connected', {
        module: 'WebSocket',
        data: { socketId: socket.id, url },
      });
      statusRef.current = WebSocketStatus.Connected;
      onConnect?.();
    });

    socket.on('disconnect', (reason: string) => {
      logger.warn('WebSocket disconnected', {
        module: 'WebSocket',
        data: { reason, url },
      });
      statusRef.current = WebSocketStatus.Disconnected;
      onDisconnect?.();
    });

    socket.on('connect_error', (error: Error) => {
      logger.error('WebSocket connection error', {
        module: 'WebSocket',
        data: { url },
        error,
      });
      statusRef.current = WebSocketStatus.Error;
      onError?.(error);
    });

    socketRef.current = socket;
  }, [url, reconnection, reconnectionDelay, reconnectionAttempts, onConnect, onDisconnect, onError]);

  /**
   * 断开 WebSocket 连接
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      logger.debug('Disconnecting WebSocket', { module: 'WebSocket' });
      socketRef.current.disconnect();
      socketRef.current = null;
      statusRef.current = WebSocketStatus.Disconnected;
    }
  }, []);

  /**
   * 监听 WebSocket 事件
   * @param event 事件名称
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  const on = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    callback: WebSocketEvents[K]
  ): (() => void) => {
    if (!socketRef.current) {
      logger.warn('WebSocket not connected, cannot subscribe to event', {
        module: 'WebSocket',
        data: { event },
      });
      return () => {};
    }

    logger.debug(`WebSocket subscribing to event: ${String(event)}`, {
      module: 'WebSocket',
      data: { event },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socketRef.current.on(event as string, callback as any);

    // 返回取消订阅函数
    return () => {
      logger.debug(`WebSocket unsubscribing from event: ${String(event)}`, {
        module: 'WebSocket',
        data: { event },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socketRef.current?.off(event as string, callback as any);
    };
  }, []);

  /**
   * 发送 WebSocket 事件
   * @param event 事件名称
   * @param data 数据
   */
  const emit = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    data: WebSocketEvents[K]
  ) => {
    if (!socketRef.current?.connected) {
      logger.warn('WebSocket not connected, cannot emit event', {
        module: 'WebSocket',
        data: { event },
      });
      return;
    }
    
    logger.debug(`WebSocket emitting event: ${String(event)}`, {
      module: 'WebSocket',
      data: { event, payload: data },
    });
    
    socketRef.current.emit(event as string, data);
  }, []);

  /**
   * 初始化连接
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // 清理函数
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket: socketRef.current,
    status: statusRef.current,
    connect,
    disconnect,
    on,
    emit,
  };
}

