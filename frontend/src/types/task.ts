/**
 * 任务状态枚举
 */
export enum TaskStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * 覆盖策略枚举
 */
export enum CoverageStrategy {
  FULL = 'FULL',
  SMOKE = 'SMOKE', // 后端使用 SMOKE 而不是 CORE
  CUSTOM = 'CUSTOM',
}

/**
 * 任务信息
 */
export interface Task {
  id: string;
  name: string;
  appVersionId: string;
  deviceIds: string[];
  coverageProfile: CoverageStrategy; // 后端字段名是 coverageProfile
  blacklistPaths?: string[];
  priority: number;
  status: TaskStatus;
  createdBy?: string;
  startedAt?: Date;
  completedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  appVersion?: {
    version: string;
    app: {
      name: string;
    };
  };
}

/**
 * 任务运行信息
 */
export interface TaskRun {
  id: string;
  taskId: string;
  deviceId: string;
  status: TaskStatus;
  screensVisited: number;
  actionsExecuted: number;
  locatorsGenerated: number;
  failureReason?: string;
  startedAt?: Date;
  completedAt?: Date;
  metrics?: Record<string, unknown>;
}

/**
 * 创建任务 DTO
 */
export interface CreateTaskDto {
  name: string;
  appVersionId: string;
  deviceIds: string[];
  coverageProfile: CoverageStrategy; // 后端字段名是 coverageProfile
  coverageConfig?: {
    blacklistPaths?: string[];
    maxDepth?: number;
    timeout?: number;
  };
  priority?: number;
}

/**
 * 任务统计信息
 */
export interface TaskStats {
  total: number;
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  cancelled: number;
}

