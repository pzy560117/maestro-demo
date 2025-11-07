import { Injectable, Logger } from '@nestjs/common';
import {
  OrchestratorState,
  TaskRunContext,
  StateTransitionResult,
  QueuePriority,
  RecoveryStrategy,
} from '../types/orchestrator.types';
import { ScreenCaptureService } from './screen-capture.service';
import { ActionExecutorService } from './action-executor.service';
import { AppiumService } from '../../integrations/appium/appium.service';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * 状态机服务
 * 实现功能 C：遍历调度状态机（FR-02）
 *
 * 验收标准：
 * 1. 当界面重复时，VisitedGraph 阻止重复动作，队列降级
 * 2. 执行失败时调用回退策略（UI Undo → App Restart）
 * 3. 任务完成后状态变为 SUCCEEDED
 * 4. 任务失败时 failure_reason 包含具体动作/错误码
 */
@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);

  constructor(
    private readonly screenCapture: ScreenCaptureService,
    private readonly actionExecutor: ActionExecutorService,
    private readonly appium: AppiumService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 状态转换主控函数
   * 根据当前状态和上下文决定下一个状态
   */
  async transition(
    currentState: OrchestratorState,
    context: TaskRunContext,
  ): Promise<StateTransitionResult> {
    this.logger.debug(`State transition: ${currentState} -> ? (TaskRun: ${context.taskRunId})`);

    try {
      switch (currentState) {
        case OrchestratorState.IDLE:
          return this.handleIdleState(context);
        case OrchestratorState.BOOTSTRAPPING:
          return this.handleBootstrappingState(context);
        case OrchestratorState.TRAVERSING:
          return this.handleTraversingState(context);
        case OrchestratorState.INSPECTING:
          return this.handleInspectingState(context);
        case OrchestratorState.EXECUTING:
          return this.handleExecutingState(context);
        case OrchestratorState.VERIFYING:
          return this.handleVerifyingState(context);
        case OrchestratorState.RECOVERING:
          return this.handleRecoveringState(context);
        case OrchestratorState.TERMINATED:
          return this.handleTerminatedState(context);
        default:
          throw new Error(`未知状态: ${currentState}`);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`State transition error: ${err.message}`, err.stack);
      return {
        newState: OrchestratorState.RECOVERING,
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * IDLE → BOOTSTRAPPING
   * 开始引导启动流程
   */
  private async handleIdleState(context: TaskRunContext): Promise<StateTransitionResult> {
    this.logger.log(`Starting task run: ${context.taskRunId}`);

    // 初始化统计数据
    context.stats = {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      coverageScreens: 0,
      startTime: new Date(),
    };

    return {
      newState: OrchestratorState.BOOTSTRAPPING,
      success: true,
    };
  }

  /**
   * BOOTSTRAPPING → INSPECTING
   * 完成应用安装和初始化后进入检查状态
   */
  private async handleBootstrappingState(context: TaskRunContext): Promise<StateTransitionResult> {
    this.logger.log(`Bootstrapping for ${context.packageName}`);

    try {
      // 1. 创建 Appium session（如果还没有）
      if (!context.appiumSessionId) {
        this.logger.log(`Creating Appium session for device ${context.deviceId}`);

        // 获取设备序列号
        const device = await this.prisma.device.findUnique({
          where: { id: context.deviceId },
        });

        if (!device) {
          throw new Error(`Device ${context.deviceId} not found`);
        }

        // 创建 Appium session（带重试机制）
        const sessionId = await this.createAppiumSessionWithRetry(
          device.serial,
          context.packageName,
          3, // 最多重试3次
        );

        context.appiumSessionId = sessionId;
        this.logger.log(`Appium session created: ${sessionId}`);
      }

      // 2. 启动应用
      await this.appium.launchApp(context.appiumSessionId, context.packageName);
      this.logger.log(`App launched: ${context.packageName}`);

      return {
        newState: OrchestratorState.INSPECTING,
        success: true,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Bootstrapping failed: ${err.message}`);
      return {
        newState: OrchestratorState.RECOVERING,
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * 带重试机制的 Appium 会话创建
   * @param deviceSerial 设备序列号
   * @param packageName 应用包名
   * @param maxRetries 最大重试次数
   * @returns 会话ID
   */
  private async createAppiumSessionWithRetry(
    deviceSerial: string,
    packageName: string,
    maxRetries: number,
  ): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Attempting to create Appium session (attempt ${attempt}/${maxRetries})`);

        const sessionId = await this.appium.createSession(deviceSerial, packageName);

        this.logger.log(`Appium session created successfully on attempt ${attempt}`);
        return sessionId;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Appium session creation failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`,
        );

        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          const delayMs = attempt * 2000; // 递增延迟：2s, 4s, 6s
          this.logger.log(`Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // 所有重试都失败
    throw new Error(
      `Failed to create Appium session after ${maxRetries} attempts. Last error: ${lastError?.message}`,
    );
  }

  /**
   * TRAVERSING → INSPECTING | TERMINATED
   * 决策下一步动作
   *
   * 验收标准1：当界面重复时，VisitedGraph 阻止重复动作，队列降级
   */
  private async handleTraversingState(context: TaskRunContext): Promise<StateTransitionResult> {
    // 检查终止条件
    if (this.shouldTerminate(context)) {
      return {
        newState: OrchestratorState.TERMINATED,
        success: true,
        data: { reason: 'coverage_completed' },
      };
    }

    // 从队列中选择下一个动作
    const nextAction = this.dequeueAction(context);

    if (!nextAction) {
      // 队列为空，终止任务
      return {
        newState: OrchestratorState.TERMINATED,
        success: true,
        data: { reason: 'queue_empty' },
      };
    }

    // 检查动作是否在黑名单中
    if (this.isBlacklisted(nextAction, context)) {
      this.logger.debug(`Action blacklisted, skipping: ${nextAction.description}`);
      // 跳过该动作，继续遍历
      return {
        newState: OrchestratorState.TRAVERSING,
        success: true,
      };
    }

    return {
      newState: OrchestratorState.INSPECTING,
      success: true,
      data: { nextAction },
    };
  }

  /**
   * INSPECTING → EXECUTING
   * 分析当前界面，生成动作计划
   */
  private async handleInspectingState(context: TaskRunContext): Promise<StateTransitionResult> {
    this.logger.debug(`Inspecting screen for TaskRun ${context.taskRunId}`);

    try {
      if (!context.appiumSessionId) {
        throw new Error('Appium session not initialized');
      }

      // 1. 捕获当前界面
      const screenData = await this.screenCapture.captureScreen(
        context.appiumSessionId,
        context.taskRunId,
        context.appVersionId,
      );

      // 2. 检查界面是否已访问
      if (context.visitedGraph.visitedSignatures.has(screenData.signature)) {
        this.logger.debug(`Screen already visited: ${screenData.signature}`);
        // 界面已访问，可能需要回退或选择其他动作
        return {
          newState: OrchestratorState.TRAVERSING,
          success: true,
          data: { revisit: true, signature: screenData.signature },
        };
      }

      // 3. 标记界面为已访问
      context.visitedGraph.visitedSignatures.add(screenData.signature);
      context.stats.coverageScreens += 1;

      // 4. 保存当前界面数据到上下文
      context.currentScreen = screenData;

      return {
        newState: OrchestratorState.EXECUTING,
        success: true,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Inspecting failed: ${err.message}`);
      return {
        newState: OrchestratorState.RECOVERING,
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * EXECUTING → VERIFYING | RECOVERING
   * 执行动作
   *
   * 验收标准2：执行失败时调用回退策略
   */
  private async handleExecutingState(context: TaskRunContext): Promise<StateTransitionResult> {
    try {
      if (!context.appiumSessionId || !context.currentScreen) {
        throw new Error('Missing session or screen data');
      }

      // 执行下一个动作
      const result = await this.actionExecutor.executeNextAction(
        context.appiumSessionId,
        context.taskRunId,
        context.currentScreen.screenId,
        context.currentScreen.screenshotPath,
        context.currentScreen.domPath,
        context.currentScreen.domJson,
        context.currentScreen.visionSummary,
        context.currentScreen.screenshotPublicUrl,
      );

      context.stats.totalActions += 1;

      if (result.success) {
        context.stats.successfulActions += 1;
        this.logger.log(`Action executed successfully: ${result.actionType}`);
        return {
          newState: OrchestratorState.VERIFYING,
          success: true,
          data: { actionId: result.actionId },
        };
      } else {
        context.stats.failedActions += 1;
        this.logger.warn(`Action execution failed: ${result.error}`);
        return {
          newState: OrchestratorState.RECOVERING,
          success: false,
          error: result.error || 'action_execution_failed',
        };
      }
    } catch (error) {
      const err = error as Error;
      context.stats.failedActions += 1;
      this.logger.error(`Executing failed: ${err.message}`);
      return {
        newState: OrchestratorState.RECOVERING,
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * VERIFYING → TRAVERSING | RECOVERING
   * 验证动作执行结果
   */
  private async handleVerifyingState(context: TaskRunContext): Promise<StateTransitionResult> {
    this.logger.debug(`Verifying action result`);

    try {
      // 验证成功后，等待界面稳定
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 继续遍历
      return {
        newState: OrchestratorState.TRAVERSING,
        success: true,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Verifying failed: ${err.message}`);
      return {
        newState: OrchestratorState.RECOVERING,
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * RECOVERING → TRAVERSING | TERMINATED
   * 执行回退策略
   *
   * 验收标准2：执行回退策略（UI Undo → App Restart → Device Reboot）
   */
  private async handleRecoveringState(context: TaskRunContext): Promise<StateTransitionResult> {
    this.logger.log(`Recovering from failure`);

    // 选择回退策略（按严重程度递增）
    const strategy = this.selectRecoveryStrategy(context);

    try {
      await this.executeRecoveryStrategy(strategy, context);

      // 回退成功，继续遍历
      return {
        newState: OrchestratorState.TRAVERSING,
        success: true,
        data: { recoveryStrategy: strategy },
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Recovery failed: ${err.message}`);

      // 回退失败，终止任务
      return {
        newState: OrchestratorState.TERMINATED,
        success: false,
        error: `recovery_failed: ${err.message}`,
      };
    }
  }

  /**
   * TERMINATED
   * 任务终止，清理资源
   */
  private async handleTerminatedState(context: TaskRunContext): Promise<StateTransitionResult> {
    this.logger.log(`Task run terminated: ${context.taskRunId}`);

    // TODO: 在 Iteration 1 后续实现清理逻辑

    return {
      newState: OrchestratorState.TERMINATED,
      success: true,
    };
  }

  /**
   * 检查是否应该终止任务
   *
   * 验收标准3：任务完成后状态变为 SUCCEEDED
   */
  private shouldTerminate(context: TaskRunContext): boolean {
    const { stats, coverageConfig } = context;

    // 检查超时
    const elapsedSeconds = (Date.now() - stats.startTime.getTime()) / 1000;
    if (coverageConfig.timeout && elapsedSeconds >= coverageConfig.timeout) {
      this.logger.warn(`Task timeout: ${elapsedSeconds}s`);
      return true;
    }

    // 检查最大动作数
    if (coverageConfig.maxActions && stats.totalActions >= coverageConfig.maxActions) {
      this.logger.log(`Reached max actions: ${stats.totalActions}`);
      return true;
    }

    // 检查覆盖目标
    // TODO: 根据 coverageProfile 判断是否达到覆盖要求

    return false;
  }

  /**
   * 从队列中取出下一个动作
   * 优先级：PRIMARY > FALLBACK > REVISIT
   *
   * 验收标准1：队列降级
   */
  private dequeueAction(context: TaskRunContext): any {
    const { actionQueues } = context;

    // 按优先级出队
    if (actionQueues[QueuePriority.PRIMARY].length > 0) {
      return actionQueues[QueuePriority.PRIMARY].shift();
    }

    if (actionQueues[QueuePriority.FALLBACK].length > 0) {
      return actionQueues[QueuePriority.FALLBACK].shift();
    }

    if (actionQueues[QueuePriority.REVISIT].length > 0) {
      return actionQueues[QueuePriority.REVISIT].shift();
    }

    return null;
  }

  /**
   * 检查动作是否在黑名单中
   */
  private isBlacklisted(action: any, context: TaskRunContext): boolean {
    const { blacklistPaths } = context.coverageConfig;

    if (!blacklistPaths || blacklistPaths.length === 0) {
      return false;
    }

    // TODO: 实现黑名单匹配逻辑

    return false;
  }

  /**
   * 选择回退策略
   * 根据失败次数选择逐步升级的策略
   */
  private selectRecoveryStrategy(context: TaskRunContext): RecoveryStrategy {
    const failedActions = context.stats.failedActions;

    if (failedActions <= 3) {
      return RecoveryStrategy.UI_UNDO;
    } else if (failedActions <= 6) {
      return RecoveryStrategy.APP_RESTART;
    } else if (failedActions <= 10) {
      return RecoveryStrategy.CLEAN_RESTART;
    } else {
      return RecoveryStrategy.DEVICE_REBOOT;
    }
  }

  /**
   * 执行回退策略
   */
  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    context: TaskRunContext,
  ): Promise<void> {
    this.logger.log(`Executing recovery strategy: ${strategy}`);

    if (!context.appiumSessionId) {
      throw new Error('No Appium session available for recovery');
    }

    switch (strategy) {
      case RecoveryStrategy.UI_UNDO:
        // 返回上一页
        this.logger.debug('UI Undo: Pressing back button');
        await this.appium.back(context.appiumSessionId);
        await new Promise((resolve) => setTimeout(resolve, 500));
        break;

      case RecoveryStrategy.APP_RESTART:
        // 重启应用
        this.logger.debug('App Restart: Stopping and starting app');
        await this.appium.launchApp(context.appiumSessionId, context.packageName);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        break;

      case RecoveryStrategy.CLEAN_RESTART:
        // 清除数据并重启（需要 ADB 支持）
        this.logger.debug('Clean Restart: Clearing app data and restarting');
        // TODO: 实现 ADB 清除数据命令
        await this.appium.launchApp(context.appiumSessionId, context.packageName);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        break;

      case RecoveryStrategy.DEVICE_REBOOT:
        // 设备重启（需要 ADB 支持）
        this.logger.debug('Device Reboot: Rebooting device');
        // TODO: 实现设备重启逻辑
        throw new Error('Device reboot not implemented');
    }
  }
}
