import { Injectable, Logger } from '@nestjs/common';
import {
  OrchestratorState,
  TaskRunContext,
  StateTransitionResult,
  QueuePriority,
  RecoveryStrategy,
} from '../types/orchestrator.types';

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

  /**
   * 状态转换主控函数
   * 根据当前状态和上下文决定下一个状态
   */
  async transition(
    currentState: OrchestratorState,
    context: TaskRunContext,
  ): Promise<StateTransitionResult> {
    this.logger.debug(
      `State transition: ${currentState} -> ? (TaskRun: ${context.taskRunId})`,
    );

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
      this.logger.error(
        `State transition error: ${err.message}`,
        err.stack,
      );
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
  private async handleIdleState(
    context: TaskRunContext,
  ): Promise<StateTransitionResult> {
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
  private async handleBootstrappingState(
    context: TaskRunContext,
  ): Promise<StateTransitionResult> {
    this.logger.log(`Bootstrapping completed for ${context.packageName}`);

    // TODO: 在 Iteration 1 后续实现安装 APK、启动应用逻辑

    return {
      newState: OrchestratorState.INSPECTING,
      success: true,
    };
  }

  /**
   * TRAVERSING → INSPECTING | TERMINATED
   * 决策下一步动作
   * 
   * 验收标准1：当界面重复时，VisitedGraph 阻止重复动作，队列降级
   */
  private async handleTraversingState(
    context: TaskRunContext,
  ): Promise<StateTransitionResult> {
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
  private async handleInspectingState(
    context: TaskRunContext,
  ): Promise<StateTransitionResult> {
    // TODO: 在 Iteration 1 后续实现截图、DOM 获取、LLM 请求

    this.logger.debug(`Inspecting screen for TaskRun ${context.taskRunId}`);

    return {
      newState: OrchestratorState.EXECUTING,
      success: true,
    };
  }

  /**
   * EXECUTING → VERIFYING | RECOVERING
   * 执行动作
   * 
   * 验收标准2：执行失败时调用回退策略
   */
  private async handleExecutingState(
    context: TaskRunContext,
  ): Promise<StateTransitionResult> {
    // TODO: 在 Iteration 1 后续实现 Appium 动作执行

    context.stats.totalActions += 1;

    // 模拟执行成功
    const executionSuccess = true;

    if (executionSuccess) {
      context.stats.successfulActions += 1;
      return {
        newState: OrchestratorState.VERIFYING,
        success: true,
      };
    } else {
      context.stats.failedActions += 1;
      this.logger.warn(`Action execution failed, entering recovery`);
      return {
        newState: OrchestratorState.RECOVERING,
        success: false,
        error: 'action_execution_failed',
      };
    }
  }

  /**
   * VERIFYING → TRAVERSING | RECOVERING
   * 验证动作执行结果
   */
  private async handleVerifyingState(
    context: TaskRunContext,
  ): Promise<StateTransitionResult> {
    // TODO: 在 Iteration 1 后续实现验证逻辑

    this.logger.debug(`Verifying action result`);

    // 验收标准1：记录界面签名，更新 VisitedGraph
    // 假设验证成功，增加覆盖界面数
    context.stats.coverageScreens += 1;

    return {
      newState: OrchestratorState.TRAVERSING,
      success: true,
    };
  }

  /**
   * RECOVERING → TRAVERSING | TERMINATED
   * 执行回退策略
   * 
   * 验收标准2：执行回退策略（UI Undo → App Restart → Device Reboot）
   */
  private async handleRecoveringState(
    context: TaskRunContext,
  ): Promise<StateTransitionResult> {
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
  private async handleTerminatedState(
    context: TaskRunContext,
  ): Promise<StateTransitionResult> {
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
    const elapsedSeconds =
      (Date.now() - stats.startTime.getTime()) / 1000;
    if (coverageConfig.timeout && elapsedSeconds >= coverageConfig.timeout) {
      this.logger.warn(`Task timeout: ${elapsedSeconds}s`);
      return true;
    }

    // 检查最大动作数
    if (
      coverageConfig.maxActions &&
      stats.totalActions >= coverageConfig.maxActions
    ) {
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

    switch (strategy) {
      case RecoveryStrategy.UI_UNDO:
        // TODO: 实现 UI 返回逻辑
        this.logger.debug('UI Undo: Pressing back button');
        break;
      case RecoveryStrategy.APP_RESTART:
        // TODO: 实现应用重启逻辑
        this.logger.debug('App Restart: Stopping and starting app');
        break;
      case RecoveryStrategy.CLEAN_RESTART:
        // TODO: 实现清除数据重启逻辑
        this.logger.debug('Clean Restart: Clearing app data and restarting');
        break;
      case RecoveryStrategy.DEVICE_REBOOT:
        // TODO: 实现设备重启逻辑
        this.logger.debug('Device Reboot: Rebooting device');
        break;
    }
  }
}

