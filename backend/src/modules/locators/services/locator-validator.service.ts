import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ValidationType, ValidationStatus } from '@prisma/client';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  status: ValidationStatus;
  latencyMs: number;
  screenshotPath?: string;
  notes?: string;
}

/**
 * 定位验证服务
 * 功能 F：自动验证与截图回放（FR-08）
 * 
 * 职责：
 * 1. 验证定位候选是否可点击/高亮
 * 2. 记录验证结果与截图
 * 3. 更新成功率
 * 4. 触发验证失败告警
 * 
 * 验收标准：
 * 1. 验证通过的候选 status=PASSED，记录 last_verified_at
 * 2. 失败超限时产生告警，记录失败截图
 * 3. 回放界面可查看验证前后截图
 */
@Injectable()
export class LocatorValidatorService {
  private readonly logger = new Logger(LocatorValidatorService.name);
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 验证定位候选
   * 
   * @param locatorCandidateId - 定位候选 ID
   * @param taskRunId - 任务运行 ID
   * @param validationType - 验证类型
   * @param executor - 执行器（实际执行验证的函数）
   * @returns 验证结果
   */
  async validateCandidate(
    locatorCandidateId: string,
    taskRunId: string,
    validationType: ValidationType,
    executor: () => Promise<ValidationResult>,
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    let result: ValidationResult;

    try {
      // 执行验证
      result = await executor();

      // 记录验证结果
      await this.recordValidation(
        locatorCandidateId,
        taskRunId,
        validationType,
        result,
      );

      // 更新成功率
      if (result.status === ValidationStatus.PASSED) {
        await this.updateSuccessRate(locatorCandidateId, true);
        await this.updateLastVerifiedAt(locatorCandidateId);
      } else {
        await this.updateSuccessRate(locatorCandidateId, false);
      }

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Validation failed: ${err.message}`, err.stack);

      result = {
        status: ValidationStatus.FAILED,
        latencyMs: Date.now() - startTime,
        notes: err.message,
      };

      await this.recordValidation(
        locatorCandidateId,
        taskRunId,
        validationType,
        result,
      );

      await this.updateSuccessRate(locatorCandidateId, false);

      return result;
    }
  }

  /**
   * 批量验证定位候选（按置信度顺序）
   * 
   * @param elementId - 元素 ID
   * @param taskRunId - 任务运行 ID
   * @param validationType - 验证类型
   * @param executor - 执行器工厂函数
   * @returns 第一个成功的定位候选 ID，如果全部失败返回 null
   */
  async validateCandidatesInOrder(
    elementId: string,
    taskRunId: string,
    validationType: ValidationType,
    executorFactory: (locatorValue: string, strategy: string) => Promise<ValidationResult>,
  ): Promise<string | null> {
    // 获取所有定位候选，按置信度排序
    const candidates = await this.prisma.locatorCandidate.findMany({
      where: { elementId },
      orderBy: [
        { isPrimary: 'desc' },
        { score: 'desc' },
      ],
      take: 5,
    });

    if (candidates.length === 0) {
      this.logger.warn(`No locator candidates found for element ${elementId}`);
      return null;
    }

    // 按顺序尝试每个候选
    for (const candidate of candidates) {
      this.logger.debug(`Validating candidate ${candidate.id} (${candidate.strategy}: ${candidate.locatorValue})`);

      const result = await this.validateCandidate(
        candidate.id,
        taskRunId,
        validationType,
        () => executorFactory(candidate.locatorValue, candidate.strategy),
      );

      if (result.status === ValidationStatus.PASSED) {
        this.logger.log(`Validation passed for candidate ${candidate.id}`);
        return candidate.id;
      }

      this.logger.warn(`Validation failed for candidate ${candidate.id}: ${result.notes}`);
    }

    // 全部失败，触发告警
    await this.triggerLocatorFailureAlert(elementId, taskRunId, candidates.length);

    return null;
  }

  /**
   * 记录验证结果
   */
  private async recordValidation(
    locatorCandidateId: string,
    taskRunId: string,
    validationType: ValidationType,
    result: ValidationResult,
  ): Promise<void> {
    await this.prisma.elementValidation.create({
      data: {
        locatorCandidateId,
        taskRunId,
        validationType,
        status: result.status,
        attemptAt: new Date(),
        latencyMs: result.latencyMs,
        screenshotPath: result.screenshotPath || null,
        notes: result.notes || null,
      },
    });

    this.logger.debug(`Validation recorded: ${result.status}, latency: ${result.latencyMs}ms`);
  }

  /**
   * 更新成功率
   * 采用滑动窗口算法，只考虑最近 N 次验证
   */
  private async updateSuccessRate(locatorCandidateId: string, success: boolean): Promise<void> {
    const WINDOW_SIZE = 10;

    // 获取最近的验证记录
    const recentValidations = await this.prisma.elementValidation.findMany({
      where: { locatorCandidateId },
      orderBy: { attemptAt: 'desc' },
      take: WINDOW_SIZE,
    });

    if (recentValidations.length === 0) return;

    // 计算成功率
    const successCount = recentValidations.filter(
      (v) => v.status === ValidationStatus.PASSED,
    ).length;

    const successRate = (successCount / recentValidations.length) * 100;

    // 更新定位候选的成功率
    await this.prisma.locatorCandidate.update({
      where: { id: locatorCandidateId },
      data: { successRate },
    });

    this.logger.debug(`Updated success rate for ${locatorCandidateId}: ${successRate.toFixed(2)}%`);
  }

  /**
   * 更新最后验证时间
   */
  private async updateLastVerifiedAt(locatorCandidateId: string): Promise<void> {
    await this.prisma.locatorCandidate.update({
      where: { id: locatorCandidateId },
      data: { lastVerifiedAt: new Date() },
    });
  }

  /**
   * 触发定位失败告警
   */
  private async triggerLocatorFailureAlert(
    elementId: string,
    taskRunId: string,
    attemptedCount: number,
  ): Promise<void> {
    await this.prisma.alert.create({
      data: {
        taskRunId,
        elementId,
        alertType: 'LOCATOR_FAILURE',
        severity: 'P2',
        message: `定位验证失败：尝试了 ${attemptedCount} 个定位候选，均未成功`,
        payload: {
          attemptedCount,
          timestamp: new Date().toISOString(),
        } as any,
        status: 'OPEN',
        triggeredAt: new Date(),
      },
    });

    this.logger.warn(`Locator failure alert created for element ${elementId}`);
  }

  /**
   * 查询元素的验证历史
   */
  async getValidationHistory(
    elementId: string,
    options?: { skip?: number; take?: number },
  ): Promise<any[]> {
    const validations = await this.prisma.elementValidation.findMany({
      where: {
        locatorCandidate: {
          elementId,
        },
      },
      include: {
        locatorCandidate: {
          select: {
            strategy: true,
            locatorValue: true,
            score: true,
          },
        },
      },
      orderBy: { attemptAt: 'desc' },
      skip: options?.skip || 0,
      take: options?.take || 20,
    });

    return validations;
  }
}

