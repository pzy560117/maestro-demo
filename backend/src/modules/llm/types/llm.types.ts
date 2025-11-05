/**
 * LLM 模块类型定义
 * 实现功能 D：LLM 指令生成与安全控制（FR-03/04）
 */

/**
 * 动作白名单类型
 */
export enum AllowedActionType {
  CLICK = 'CLICK',
  INPUT = 'INPUT',
  SCROLL = 'SCROLL',
  NAVIGATE = 'NAVIGATE',
  SWIPE = 'SWIPE',
  LONG_PRESS = 'LONG_PRESS',
}

/**
 * LLM 请求参数
 */
export interface LlmRequest {
  /** 任务运行ID */
  taskRunId: string;
  /** 界面ID（可选） */
  screenId?: string;
  /** 截图路径 */
  screenshotPath: string;
  /** DOM 结构（可选） */
  domJson?: any;
  /** 历史操作记录 */
  historyActions?: Array<{
    action: string;
    description: string;
    timestamp: string;
  }>;
  /** 动作白名单 */
  allowedActions: AllowedActionType[];
  /** 系统提示词 */
  systemPrompt?: string;
  /** 用户提示词 */
  userPrompt: string;
}

/**
 * LLM 响应结构
 */
export interface LlmResponse {
  /** 推荐的动作计划 */
  actionPlan: {
    /** 动作类型 */
    actionType: AllowedActionType;
    /** 动作参数 */
    params: {
      /** 目标元素描述或坐标 */
      target?: string | { x: number; y: number };
      /** 输入文本 */
      text?: string;
      /** 滚动方向 */
      direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
      /** 距离 */
      distance?: number;
      [key: string]: any;
    };
    /** 动作描述 */
    description: string;
    /** 预期结果 */
    expectedOutcome?: string;
    /** 置信度 */
    confidence: number;
  };
  /** 思维链（用于审计和调试） */
  reasoning?: string;
  /** 当前界面分析 */
  screenAnalysis?: {
    /** 界面类型（登录、列表、详情等） */
    screenType?: string;
    /** 主要元素 */
    keyElements?: string[];
    /** 可交互元素数量 */
    interactableCount?: number;
  };
}

/**
 * 安全校验结果
 */
export interface SafetyCheckResult {
  /** 是否通过校验 */
  passed: boolean;
  /** 拒绝原因 */
  reason?: string;
  /** 违规字段 */
  violatedField?: string;
  /** 建议的替代动作 */
  fallbackAction?: any;
}

/**
 * LLM 日志记录
 */
export interface LlmLogRecord {
  /** 任务运行ID */
  taskRunId: string;
  /** 界面ID */
  screenId?: string;
  /** 模型名称 */
  modelName: string;
  /** Prompt tokens */
  promptTokens: number;
  /** Completion tokens */
  completionTokens: number;
  /** 延迟（毫秒） */
  latencyMs: number;
  /** 请求负载 */
  requestPayload: any;
  /** 响应负载 */
  responsePayload: any;
  /** 安全标记 */
  safetyFlags?: {
    /** 是否被拒绝 */
    rejected?: boolean;
    /** 拒绝原因 */
    reason?: string;
    /** 白名单校验 */
    whitelistCheck?: boolean;
  };
  /** 错误码 */
  errorCode?: string;
  /** 成本 */
  cost?: number;
}

/**
 * Prompt 构建器配置
 */
export interface PromptBuilderConfig {
  /** 系统提示词模板 */
  systemPromptTemplate: string;
  /** 用户提示词模板 */
  userPromptTemplate: string;
  /** 最大 token 数 */
  maxTokens: number;
  /** 温度参数 */
  temperature: number;
  /** 是否启用多模态 */
  multimodal: boolean;
}

/**
 * LLM 配置
 */
export interface LlmConfig {
  /** API 端点 */
  apiEndpoint: string;
  /** API 密钥 */
  apiKey: string;
  /** 模型名称 */
  modelName: string;
  /** 最大 token 数 */
  maxTokens: number;
  /** 温度 */
  temperature: number;
  /** 超时时间（毫秒） */
  timeoutMs: number;
  /** 是否启用多模态 */
  multimodal: boolean;
}

