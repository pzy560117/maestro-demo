import { VisionSnapshot } from '../../common/types/vision.types';

/**
 * Orchestrator 类型定义
 * 实现功能 C：遍历调度状态机（FR-02）
 */

/**
 * 调度器状态枚举
 * 状态流转：Idle → Bootstrapping → Traversing → Inspecting → Executing → Verifying → Traversing/Recovering → Terminated
 */
export enum OrchestratorState {
  /** 空闲状态 - 等待任务分配 */
  IDLE = 'IDLE',
  /** 引导启动 - 安装应用、初始化环境 */
  BOOTSTRAPPING = 'BOOTSTRAPPING',
  /** 遍历中 - 决策下一个动作 */
  TRAVERSING = 'TRAVERSING',
  /** 检查中 - 分析当前界面 */
  INSPECTING = 'INSPECTING',
  /** 执行中 - 执行动作 */
  EXECUTING = 'EXECUTING',
  /** 验证中 - 验证动作结果 */
  VERIFYING = 'VERIFYING',
  /** 恢复中 - 执行回退策略 */
  RECOVERING = 'RECOVERING',
  /** 已终止 - 任务完成或失败 */
  TERMINATED = 'TERMINATED',
}

/**
 * 动作队列优先级
 */
export enum QueuePriority {
  /** 主队列 - 未访问的新界面 */
  PRIMARY = 'PRIMARY',
  /** 降级队列 - 访问过的界面 */
  FALLBACK = 'FALLBACK',
  /** 重访队列 - 需要重新验证的界面 */
  REVISIT = 'REVISIT',
}

/**
 * 回退策略类型
 */
export enum RecoveryStrategy {
  /** UI 撤销 - 返回上一页 */
  UI_UNDO = 'UI_UNDO',
  /** 应用重启 */
  APP_RESTART = 'APP_RESTART',
  /** 清除数据重启 */
  CLEAN_RESTART = 'CLEAN_RESTART',
  /** 设备重启 */
  DEVICE_REBOOT = 'DEVICE_REBOOT',
}

/**
 * 界面签名
 * 用于识别和去重界面
 */
export interface ScreenSignature {
  /** 签名字符串（基于截图hash、DOM hash、主文案） */
  signature: string;
  /** 截图路径 */
  screenshotPath: string;
  /** DOM 路径 */
  domPath: string;
  /** 主要文本 */
  primaryText?: string;
  /** 界面宽度 */
  width: number;
  /** 界面高度 */
  height: number;
}

/**
 * 动作计划
 * LLM 生成的执行计划
 */
export interface ActionPlan {
  /** 动作类型 */
  actionType: 'CLICK' | 'INPUT' | 'SCROLL' | 'NAVIGATE' | 'CUSTOM';
  /** 动作参数 */
  params: {
    /** 点击坐标或元素选择器 */
    target?: string | { x: number; y: number };
    /** 输入内容 */
    text?: string;
    /** 滚动方向和距离 */
    direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
    distance?: number;
    /** 自定义参数 */
    [key: string]: any;
  };
  /** 动作描述 */
  description: string;
  /** 预期结果 */
  expectedOutcome?: string;
  /** 置信度（0-1） */
  confidence: number;
}

/**
 * 已访问界面图
 * 用于去重和路径规划
 */
export interface VisitedGraph {
  /** 已访问的界面签名集合 */
  visitedSignatures: Set<string>;
  /** 界面转换边（from -> to -> action） */
  edges: Map<string, Array<{ toSignature: string; action: string }>>;
  /** 访问计数 */
  visitCounts: Map<string, number>;
}

/**
 * 任务运行上下文
 * 保存调度器运行时状态
 */
export interface TaskRunContext {
  /** 任务运行ID */
  taskRunId: string;
  /** 任务ID */
  taskId: string;
  /** 设备ID */
  deviceId: string;
  /** 应用包名 */
  packageName: string;
  /** 应用版本 */
  versionName: string;
  /** 应用版本ID */
  appVersionId: string;
  /** Appium 会话 ID */
  appiumSessionId?: string;
  /** 当前界面数据 */
  currentScreen?: {
    screenId: string;
    signature: string;
    screenshotPath: string;
    screenshotPublicUrl?: string;
    domPath: string;
    domJson?: any;
    visionSummary?: VisionSnapshot;
  };
  /** 覆盖配置 */
  coverageConfig: {
    /** 黑名单路径 */
    blacklistPaths?: string[];
    /** 最大遍历深度 */
    maxDepth?: number;
    /** 超时时间（秒） */
    timeout?: number;
    /** 最大动作数 */
    maxActions?: number;
  };
  /** 已访问界面图 */
  visitedGraph: VisitedGraph;
  /** 动作队列 */
  actionQueues: {
    [QueuePriority.PRIMARY]: ActionPlan[];
    [QueuePriority.FALLBACK]: ActionPlan[];
    [QueuePriority.REVISIT]: ActionPlan[];
  };
  /** 当前状态 */
  currentState: OrchestratorState;
  /** 当前界面签名 */
  currentScreenSignature?: string;
  /** 执行统计 */
  stats: {
    /** 总动作数 */
    totalActions: number;
    /** 成功动作数 */
    successfulActions: number;
    /** 失败动作数 */
    failedActions: number;
    /** 覆盖界面数 */
    coverageScreens: number;
    /** 开始时间 */
    startTime: Date;
  };
}

/**
 * 状态转换结果
 */
export interface StateTransitionResult {
  /** 新状态 */
  newState: OrchestratorState;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 附加数据 */
  data?: any;
}
