import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { SafetyCheckService } from './services/safety-check.service';
import {
  LlmRequest,
  LlmResponse,
  LlmLogRecord,
  LlmConfig,
  AllowedActionType,
} from './types/llm.types';

/**
 * LLM 服务
 * 实现功能 D：LLM 指令生成与安全控制（FR-03/04）
 *
 * 验收标准：
 * 1. Qwen3 返回非 JSON 格式时，系统记录错误并触发 fallback
 * 2. 非白名单动作被拦截，任务继续执行默认策略
 * 3. LLM 请求/响应存入 llm_logs，包含 tokens、latency
 * 4. 触发策略拒绝时，告警中心出现记录
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly config: LlmConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly safetyCheck: SafetyCheckService,
  ) {
    // 从配置加载 LLM 参数
    this.config = {
      apiEndpoint:
        this.configService.get<string>('LLM_API_ENDPOINT') ||
        'http://localhost:8000/v1/chat/completions',
      apiKey: this.configService.get<string>('LLM_API_KEY')?.trim() || '',
      modelName: this.configService.get<string>('LLM_MODEL_NAME') || 'qwen3-vl',
      maxTokens: this.configService.get<number>('LLM_MAX_TOKENS') || 6000,
      temperature: this.configService.get<number>('LLM_TEMPERATURE') || 0.7,
      timeoutMs: this.configService.get<number>('LLM_TIMEOUT_MS') || 30000,
      multimodal: this.configService.get<boolean>('LLM_MULTIMODAL') !== false,
    };

    this.logger.log(
      `LLM Service initialized: ${this.config.modelName} @ ${this.config.apiEndpoint}`,
    );
  }

  /**
   * 生成动作指令
   * 调用 LLM，进行安全校验，返回动作计划
   *
   * 流程：
   * 1. 构建 Prompt
   * 2. 调用 LLM API
   * 3. 解析响应
   * 4. 安全校验
   * 5. 记录日志
   */
  async generateAction(request: LlmRequest): Promise<LlmResponse> {
    const startTime = Date.now();
    const logRecord: Partial<LlmLogRecord> = {
      taskRunId: request.taskRunId,
      screenId: request.screenId,
      modelName: this.config.modelName,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: 0,
      requestPayload: {},
      responsePayload: {},
    };

    try {
      // 1. 构建 Prompt
      const { systemPrompt, userPrompt } = this.promptBuilder.buildPrompt(request);

      // 校验 Prompt 长度
      if (
        !this.promptBuilder.validatePromptLength(systemPrompt + userPrompt, this.config.maxTokens)
      ) {
        throw new Error('Prompt 长度超过限制');
      }

      // 2. 调用 LLM API
      const llmResponse = await this.callLlmApi(systemPrompt, userPrompt, {
        localPath: request.screenshotPath,
        publicUrl: request.screenshotPublicUrl,
      });

      logRecord.promptTokens = llmResponse.usage?.prompt_tokens || 0;
      logRecord.completionTokens = llmResponse.usage?.completion_tokens || 0;
      logRecord.requestPayload = {
        systemPrompt,
        userPrompt,
        screenshotPath: request.screenshotPath,
        screenshotPublicUrl: request.screenshotPublicUrl,
        allowedActions: request.allowedActions,
        visionSummary: request.visionSummary,
      };
      logRecord.responsePayload = llmResponse;

      // 3. 解析响应
      const parsedResponse = this.parseResponse(llmResponse);

      // 4. 安全校验
      const safetyResult = this.safetyCheck.performComprehensiveCheck(
        parsedResponse,
        request.allowedActions,
      );

      if (!safetyResult.passed) {
        // 验收标准2：非白名单动作被拦截
        this.logger.warn(`Safety check failed: ${safetyResult.reason}`);

        logRecord.safetyFlags = {
          rejected: true,
          reason: safetyResult.reason,
          whitelistCheck: false,
        };

        // 验收标准4：触发策略拒绝时，生成告警
        await this.createAlert(safetyResult, request.taskRunId);

        // 返回 fallback 动作
        if (safetyResult.fallbackAction) {
          return {
            actionPlan: safetyResult.fallbackAction,
            reasoning: `原动作被拒绝：${safetyResult.reason}。使用默认策略。`,
          };
        }

        // 如果没有 fallback，抛出异常
        throw new Error(`安全校验失败：${safetyResult.reason}`);
      }

      logRecord.safetyFlags = {
        rejected: false,
        whitelistCheck: true,
      };

      return parsedResponse;
    } catch (error) {
      // 验收标准1：返回非 JSON 格式时记录错误并触发 fallback
      const err = error as any;
      this.logger.error(`LLM generation failed: ${err.message}`, err.stack);

      logRecord.errorCode = err.code || 'UNKNOWN_ERROR';
      logRecord.safetyFlags = {
        rejected: true,
        reason: err.message,
      };

      // 返回默认 fallback 动作
      return {
        actionPlan: {
          actionType: AllowedActionType.NAVIGATE,
          params: {},
          description: '出现错误，返回上一页',
          confidence: 0.5,
        },
        reasoning: `LLM 调用失败：${err.message}。使用默认策略。`,
      };
    } finally {
      // 验收标准3：记录日志
      logRecord.latencyMs = Date.now() - startTime;
      await this.saveLlmLog(logRecord as LlmLogRecord);
    }
  }

  /**
   * 调用 LLM API
   * 真实的 Qwen3-VL API 调用实现
   */
  private async callLlmApi(
    systemPrompt: string,
    userPrompt: string,
    screenshot?: { localPath?: string; publicUrl?: string },
  ): Promise<any> {
    const apiKey = this.config.apiKey?.trim();

    if (!apiKey) {
      throw new Error('LLM API Key 未配置或为空');
    }

    this.logger.debug(`Calling LLM API: ${this.config.modelName} @ ${this.config.apiEndpoint}`);

    try {
      // 构建请求体
      const messages: any[] = [{ role: 'system', content: systemPrompt }];

      // 如果启用多模态且有截图，添加图片
      if (this.config.multimodal && (screenshot?.publicUrl || screenshot?.localPath)) {
        const imageUrl = screenshot?.publicUrl
          ? screenshot.publicUrl
          : screenshot?.localPath
            ? `file://${screenshot.localPath}`
            : undefined;

        if (!imageUrl) {
          messages.push({ role: 'user', content: userPrompt });
        } else {
          messages.push({
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          });
        }
      } else {
        messages.push({ role: 'user', content: userPrompt });
      }

      const requestBody = {
        model: this.config.modelName,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' },
      };

      this.logger.debug(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

      // 发起 HTTP 请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-DashScope-Token': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      this.logger.debug(`LLM API response received, tokens: ${result.usage?.total_tokens || 0}`);

      return result;
    } catch (error) {
      const err = error as any;

      // 处理超时错误
      if (err.name === 'AbortError') {
        throw new Error(`LLM API timeout after ${this.config.timeoutMs}ms`);
      }

      // 处理网络错误
      if (err.code === 'ECONNREFUSED') {
        throw new Error(
          `Cannot connect to LLM API at ${this.config.apiEndpoint}. Please check if the service is running.`,
        );
      }

      throw error;
    }
  }

  /**
   * 解析 LLM 响应
   */
  private parseResponse(llmResponse: any): LlmResponse {
    try {
      const content = llmResponse.choices?.[0]?.message?.content || '{}';

      // 尝试解析 JSON
      const parsed = JSON.parse(content);

      return parsed as LlmResponse;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to parse LLM response: ${err.message}`);
      throw new Error('LLM 响应格式错误：无法解析 JSON');
    }
  }

  /**
   * 保存 LLM 日志
   * 验收标准3：记录 tokens、latency
   */
  private async saveLlmLog(logRecord: LlmLogRecord): Promise<void> {
    try {
      await this.prisma.llmLog.create({
        data: {
          taskRunId: logRecord.taskRunId,
          screenId: logRecord.screenId || null,
          modelName: logRecord.modelName,
          promptTokens: logRecord.promptTokens,
          completionTokens: logRecord.completionTokens,
          latencyMs: logRecord.latencyMs,
          requestPayload: logRecord.requestPayload as any,
          responsePayload: logRecord.responsePayload as any,
          safetyFlags: logRecord.safetyFlags as any,
          errorCode: logRecord.errorCode || null,
          cost: this.calculateCost(logRecord),
        },
      });

      this.logger.debug(`LLM log saved: ${logRecord.taskRunId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to save LLM log: ${err.message}`);
    }
  }

  /**
   * 计算 LLM 调用成本
   * 基于 token 数量估算
   */
  private calculateCost(logRecord: LlmLogRecord): number {
    // 假设价格（实际应从配置读取）
    const promptTokenPrice = 0.0001; // 每千 tokens
    const completionTokenPrice = 0.0002;

    const promptCost = (logRecord.promptTokens / 1000) * promptTokenPrice;
    const completionCost = (logRecord.completionTokens / 1000) * completionTokenPrice;

    return promptCost + completionCost;
  }

  /**
   * 创建告警
   * 验收标准4：触发策略拒绝时生成告警
   */
  private async createAlert(safetyResult: any, taskRunId: string): Promise<void> {
    try {
      const alertData = this.safetyCheck.generateAlert(safetyResult, taskRunId);

      await this.prisma.alert.create({
        data: {
          taskRunId,
          alertType: 'TOKEN_BUDGET', // 暂时使用现有枚举
          severity: 'P2',
          message: alertData.message,
          payload: alertData.payload as any,
          status: 'OPEN',
        },
      });

      this.logger.log(`Alert created for policy violation: ${taskRunId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create alert: ${err.message}`);
    }
  }

  /**
   * 查询 LLM 日志
   */
  async getLlmLogs(taskRunId: string, limit: number = 100): Promise<any[]> {
    return this.prisma.llmLog.findMany({
      where: { taskRunId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
