import { Injectable, Logger } from '@nestjs/common';
import {
  LlmResponse,
  SafetyCheckResult,
  AllowedActionType,
} from '../types/llm.types';

/**
 * 安全校验服务
 * 实现功能 D：LLM 安全控制（FR-04）
 * 
 * 验收标准：
 * 1. Qwen3 返回非 JSON 格式时，系统记录错误并触发 fallback
 * 2. 非白名单动作被拦截，任务继续执行默认策略
 * 3. 触发策略拒绝时，告警中心出现记录
 */
@Injectable()
export class SafetyCheckService {
  private readonly logger = new Logger(SafetyCheckService.name);

  /**
   * 敏感动作关键词黑名单
   */
  private readonly sensitiveKeywords = [
    '删除',
    '卸载',
    '支付',
    '购买',
    '转账',
    '注销',
    '退出登录',
    '清除数据',
    'delete',
    'uninstall',
    'pay',
    'purchase',
    'logout',
    'sign out',
  ];

  /**
   * 敏感输入内容黑名单
   */
  private readonly sensitiveInputPatterns = [
    /DROP\s+TABLE/i, // SQL 注入
    /<script>/i, // XSS
    /rm\s+-rf/i, // 危险命令
    /\d{15,19}/, // 疑似银行卡号
    /\d{6,8}/, // 疑似密码
  ];

  /**
   * 校验 LLM 响应格式
   * 验收标准1：返回非 JSON 格式时记录错误
   */
  validateResponseFormat(response: any): SafetyCheckResult {
    // 检查必需字段
    if (!response || typeof response !== 'object') {
      return {
        passed: false,
        reason: 'LLM 响应格式错误：不是有效的 JSON 对象',
      };
    }

    if (!response.actionPlan) {
      return {
        passed: false,
        reason: 'LLM 响应格式错误：缺少 actionPlan 字段',
      };
    }

    const { actionPlan } = response;

    if (!actionPlan.actionType) {
      return {
        passed: false,
        reason: 'LLM 响应格式错误：缺少 actionType',
      };
    }

    if (!actionPlan.params || typeof actionPlan.params !== 'object') {
      return {
        passed: false,
        reason: 'LLM 响应格式错误：params 格式错误',
      };
    }

    if (
      typeof actionPlan.confidence !== 'number' ||
      actionPlan.confidence < 0 ||
      actionPlan.confidence > 1
    ) {
      return {
        passed: false,
        reason: 'LLM 响应格式错误：confidence 必须是 0-1 之间的数字',
      };
    }

    return { passed: true };
  }

  /**
   * 校验动作是否在白名单中
   * 验收标准2：非白名单动作被拦截
   */
  checkActionWhitelist(
    actionType: string,
    allowedActions: AllowedActionType[],
  ): SafetyCheckResult {
    if (!allowedActions.includes(actionType as AllowedActionType)) {
      return {
        passed: false,
        reason: `动作类型 ${actionType} 不在白名单中`,
        violatedField: 'actionType',
        fallbackAction: {
          actionType: AllowedActionType.NAVIGATE,
          params: { direction: 'back' },
          description: '返回上一页（默认策略）',
        },
      };
    }

    return { passed: true };
  }

  /**
   * 校验动作参数合法性
   */
  checkActionParams(
    actionType: AllowedActionType,
    params: any,
  ): SafetyCheckResult {
    switch (actionType) {
      case AllowedActionType.CLICK:
        return this.checkClickParams(params);
      case AllowedActionType.INPUT:
        return this.checkInputParams(params);
      case AllowedActionType.SCROLL:
        return this.checkScrollParams(params);
      case AllowedActionType.NAVIGATE:
        return this.checkNavigateParams(params);
      default:
        return { passed: true };
    }
  }

  /**
   * 校验点击参数
   */
  private checkClickParams(params: any): SafetyCheckResult {
    if (!params.target) {
      return {
        passed: false,
        reason: '点击动作缺少 target 参数',
        violatedField: 'params.target',
      };
    }

    // 检查是否点击敏感元素
    const targetStr = JSON.stringify(params.target).toLowerCase();
    for (const keyword of this.sensitiveKeywords) {
      if (targetStr.includes(keyword.toLowerCase())) {
        return {
          passed: false,
          reason: `拒绝点击敏感元素：包含关键词 "${keyword}"`,
          violatedField: 'params.target',
        };
      }
    }

    // 检查坐标合法性（如果是坐标）
    if (
      typeof params.target === 'object' &&
      ('x' in params.target || 'y' in params.target)
    ) {
      const { x, y } = params.target;
      if (
        typeof x !== 'number' ||
        typeof y !== 'number' ||
        x < 0 ||
        y < 0 ||
        x > 10000 ||
        y > 10000
      ) {
        return {
          passed: false,
          reason: '点击坐标不合法',
          violatedField: 'params.target',
        };
      }
    }

    return { passed: true };
  }

  /**
   * 校验输入参数
   */
  private checkInputParams(params: any): SafetyCheckResult {
    if (!params.text) {
      return {
        passed: false,
        reason: '输入动作缺少 text 参数',
        violatedField: 'params.text',
      };
    }

    // 检查输入内容长度
    if (params.text.length > 1000) {
      return {
        passed: false,
        reason: '输入内容过长（超过 1000 字符）',
        violatedField: 'params.text',
      };
    }

    // 检查敏感输入内容
    for (const pattern of this.sensitiveInputPatterns) {
      if (pattern.test(params.text)) {
        return {
          passed: false,
          reason: `输入内容包含敏感模式：${pattern.source}`,
          violatedField: 'params.text',
        };
      }
    }

    return { passed: true };
  }

  /**
   * 校验滚动参数
   */
  private checkScrollParams(params: any): SafetyCheckResult {
    if (!params.direction) {
      return {
        passed: false,
        reason: '滚动动作缺少 direction 参数',
        violatedField: 'params.direction',
      };
    }

    const validDirections = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    if (!validDirections.includes(params.direction)) {
      return {
        passed: false,
        reason: `滚动方向不合法：${params.direction}`,
        violatedField: 'params.direction',
      };
    }

    return { passed: true };
  }

  /**
   * 校验导航参数
   */
  private checkNavigateParams(params: any): SafetyCheckResult {
    // 导航动作通常是安全的
    return { passed: true };
  }

  /**
   * 综合安全校验
   * 组合所有校验规则
   * 
   * 验收标准3：触发策略拒绝时记录
   */
  performComprehensiveCheck(
    response: LlmResponse,
    allowedActions: AllowedActionType[],
  ): SafetyCheckResult {
    // 1. 格式校验
    const formatCheck = this.validateResponseFormat(response);
    if (!formatCheck.passed) {
      this.logger.warn(`Format check failed: ${formatCheck.reason}`);
      return formatCheck;
    }

    const { actionPlan } = response;

    // 2. 白名单校验
    const whitelistCheck = this.checkActionWhitelist(
      actionPlan.actionType,
      allowedActions,
    );
    if (!whitelistCheck.passed) {
      this.logger.warn(`Whitelist check failed: ${whitelistCheck.reason}`);
      return whitelistCheck;
    }

    // 3. 参数校验
    const paramsCheck = this.checkActionParams(
      actionPlan.actionType as AllowedActionType,
      actionPlan.params,
    );
    if (!paramsCheck.passed) {
      this.logger.warn(`Params check failed: ${paramsCheck.reason}`);
      return paramsCheck;
    }

    // 4. 置信度校验
    if (actionPlan.confidence < 0.3) {
      this.logger.warn(
        `Low confidence action: ${actionPlan.confidence}, rejecting`,
      );
      return {
        passed: false,
        reason: `置信度过低：${actionPlan.confidence}`,
        fallbackAction: {
          actionType: AllowedActionType.NAVIGATE,
          params: { direction: 'back' },
          description: '置信度不足，返回上一页',
        },
      };
    }

    this.logger.debug('Safety check passed');
    return { passed: true };
  }

  /**
   * 生成告警（当安全校验失败时）
   */
  generateAlert(checkResult: SafetyCheckResult, taskRunId: string): any {
    return {
      taskRunId,
      alertType: 'POLICY_BLOCKED',
      severity: 'P2',
      message: `LLM 动作被安全策略拒绝：${checkResult.reason}`,
      payload: {
        reason: checkResult.reason,
        violatedField: checkResult.violatedField,
        fallbackAction: checkResult.fallbackAction,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

