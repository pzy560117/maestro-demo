/**
 * 告警类型枚举
 */
export enum AlertType {
  LOCATOR_FAILURE = 'LOCATOR_FAILURE',
  TASK_FAILURE = 'TASK_FAILURE',
  SCREEN_DIFF = 'SCREEN_DIFF',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  LLM_ERROR = 'LLM_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

/**
 * 告警严重程度枚举
 */
export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * 告警状态枚举
 */
export enum AlertStatus {
  PENDING = 'PENDING',
  ACKED = 'ACKED',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED',
}

/**
 * 告警信息
 */
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  message: string;
  context?: Record<string, unknown>;
  taskId?: string;
  screenId?: string;
  deviceId?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 告警统计信息
 */
export interface AlertStats {
  total: number;
  pending: number;
  acked: number;
  resolved: number;
  critical: number;
  byType: Record<AlertType, number>;
  bySeverity: Record<AlertSeverity, number>;
}

/**
 * 创建告警 DTO
 */
export interface CreateAlertDto {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  context?: Record<string, unknown>;
  taskId?: string;
  screenId?: string;
  deviceId?: string;
}

/**
 * 更新告警 DTO
 */
export interface UpdateAlertDto {
  status?: AlertStatus;
  acknowledgedBy?: string;
  resolvedBy?: string;
}

