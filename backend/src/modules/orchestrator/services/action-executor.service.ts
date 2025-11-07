import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppiumService } from '../../integrations/appium/appium.service';
import { LlmService } from '../../llm/llm.service';
import { AllowedActionType, LlmRequest } from '../../llm/types/llm.types';
import { VisionSnapshot } from '../../common/types/vision.types';
import * as fs from 'fs/promises';

/**
 * 动作执行器服务
 * 实现 Iteration 1 功能：执行 LLM 生成的动作
 *
 * 职责：
 * 1. 调用 LLM 生成动作
 * 2. 执行动作
 * 3. 记录动作结果
 */
@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appium: AppiumService,
    private readonly llm: LlmService,
  ) {}

  /**
   * 生成并执行下一个动作
   *
   * @param sessionId - Appium 会话 ID
   * @param taskRunId - 任务运行 ID
   * @param screenId - 当前界面 ID
   * @param screenshotPath - 截图路径
   * @param domPath - DOM 文件路径
   * @param domData - 内存中的 DOM 数据（可选）
   * @param visionSummary - 视觉摘要（可选）
   * @param screenshotPublicUrl - 截图公共访问地址（可选）
   * @returns 执行结果
   */
  async executeNextAction(
    sessionId: string,
    taskRunId: string,
    screenId: string,
    screenshotPath: string,
    domPath: string,
    domData?: any,
    visionSummary?: VisionSnapshot,
    screenshotPublicUrl?: string,
  ): Promise<{
    success: boolean;
    actionType: string;
    actionId: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // 预加载 DOM 数据（如有需要）
      const resolvedDom = await this.ensureDomData(domPath, domData);

      // 1. 调用 LLM 生成动作
      const llmRequest: LlmRequest = {
        taskRunId,
        screenId,
        screenshotPath,
        screenshotPublicUrl,
        domJson: resolvedDom,
        allowedActions: [
          AllowedActionType.CLICK,
          AllowedActionType.INPUT,
          AllowedActionType.SCROLL,
          AllowedActionType.NAVIGATE,
        ],
        historyActions: await this.getRecentActions(taskRunId, 5),
        userPrompt: '请分析当前界面并生成下一步操作',
        visionSummary,
      };

      const llmResponse = await this.llm.generateAction(llmRequest);

      // 2. 创建动作记录
      const action = await this.prisma.taskAction.create({
        data: {
          taskRunId,
          screenId,
          sequence: await this.getNextSequence(taskRunId),
          actionType: this.convertToActionType(llmResponse.actionPlan.actionType),
          params: llmResponse.actionPlan.params as any,
          status: 'PENDING',
          startedAt: new Date(),
        },
      });

      // 3. 执行动作
      let executionSuccess = false;
      let errorMessage: string | undefined;

      try {
        executionSuccess = await this.executeAction(
          sessionId,
          llmResponse.actionPlan.actionType as AllowedActionType,
          llmResponse.actionPlan.params,
        );

        if (!executionSuccess) {
          errorMessage = 'Action execution returned false';
        }
      } catch (error) {
        const err = error as Error;
        executionSuccess = false;
        errorMessage = err.message;
        this.logger.error(`Action execution failed: ${err.message}`);
      }

      // 4. 更新动作记录
      const durationMs = Date.now() - startTime;
      await this.prisma.taskAction.update({
        where: { id: action.id },
        data: {
          status: executionSuccess ? 'SUCCESS' : 'FAILED',
          completedAt: new Date(),
          durationMs,
          errorMessage: errorMessage || null,
          errorCode: executionSuccess ? null : 'EXECUTION_FAILED',
        },
      });

      this.logger.log(
        `Action executed: ${llmResponse.actionPlan.actionType} - ${executionSuccess ? 'SUCCESS' : 'FAILED'}`,
      );

      return {
        success: executionSuccess,
        actionType: llmResponse.actionPlan.actionType,
        actionId: action.id,
        error: errorMessage,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to execute action: ${err.message}`, err.stack);
      return {
        success: false,
        actionType: 'UNKNOWN',
        actionId: '',
        error: err.message,
      };
    }
  }

  /**
   * 确保 DOM 数据可用
   */
  private async ensureDomData(domPath: string, domData?: any): Promise<any> {
    if (domData) {
      return domData;
    }

    if (!domPath) {
      return undefined;
    }

    try {
      const raw = await fs.readFile(domPath, 'utf-8');
      return JSON.parse(raw);
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Failed to load DOM data from ${domPath}: ${err.message}`);
      return undefined;
    }
  }

  /**
   * 执行具体动作
   */
  private async executeAction(
    sessionId: string,
    actionType: AllowedActionType,
    params: any,
  ): Promise<boolean> {
    switch (actionType) {
      case AllowedActionType.CLICK:
        return this.executeClick(sessionId, params);
      case AllowedActionType.INPUT:
        return this.executeInput(sessionId, params);
      case AllowedActionType.SCROLL:
        return this.executeScroll(sessionId, params);
      case AllowedActionType.NAVIGATE:
        return this.executeNavigate(sessionId, params);
      default:
        this.logger.warn(`Unknown action type: ${actionType}`);
        return false;
    }
  }

  /**
   * 执行点击
   */
  private async executeClick(sessionId: string, params: any): Promise<boolean> {
    const { target } = params;

    // 如果是坐标
    if (typeof target === 'object' && 'x' in target && 'y' in target) {
      // TODO: 实现坐标点击
      this.logger.warn('Coordinate click not implemented yet');
      return false;
    }

    // 如果是元素定位
    const locator = target.locator || target;
    const strategy = target.strategy || 'TEXT';

    return this.appium.click(sessionId, locator, strategy);
  }

  /**
   * 执行输入
   */
  private async executeInput(sessionId: string, params: any): Promise<boolean> {
    const { target, text } = params;

    if (!text) {
      this.logger.warn('Input text is empty');
      return false;
    }

    const locator = target.locator || target;
    const strategy = target.strategy || 'TEXT';

    return this.appium.input(sessionId, locator, strategy, text);
  }

  /**
   * 执行滚动
   */
  private async executeScroll(sessionId: string, params: any): Promise<boolean> {
    const { direction, distance } = params;

    if (!direction) {
      this.logger.warn('Scroll direction is missing');
      return false;
    }

    return this.appium.scroll(sessionId, direction, distance);
  }

  /**
   * 执行导航
   */
  private async executeNavigate(sessionId: string, params: any): Promise<boolean> {
    const { direction } = params;

    if (direction === 'back') {
      return this.appium.back(sessionId);
    }

    // 其他导航操作
    this.logger.warn(`Navigate ${direction} not implemented yet`);
    return false;
  }

  /**
   * 获取最近的动作历史
   */
  private async getRecentActions(taskRunId: string, limit: number): Promise<any[]> {
    const actions = await this.prisma.taskAction.findMany({
      where: { taskRunId },
      orderBy: { sequence: 'desc' },
      take: limit,
    });

    return actions.map((action) => ({
      action: action.actionType,
      description: JSON.stringify(action.params),
      timestamp: action.startedAt?.toISOString(),
      success: action.status === 'SUCCESS',
    }));
  }

  /**
   * 获取下一个动作序号
   */
  private async getNextSequence(taskRunId: string): Promise<number> {
    const lastAction = await this.prisma.taskAction.findFirst({
      where: { taskRunId },
      orderBy: { sequence: 'desc' },
    });

    return (lastAction?.sequence || 0) + 1;
  }

  /**
   * 将 AllowedActionType 转换为 Prisma ActionType
   */
  private convertToActionType(allowedType: AllowedActionType): any {
    // AllowedActionType 和 Prisma ActionType 的值相同，可以直接转换
    return allowedType as any;
  }
}
