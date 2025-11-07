import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AlertsService } from '../../alerts/alerts.service';
import { ScreenDiff, AlertSeverity, AlertType } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * 界面差异分析服务
 * 实现 FR-10: 界面差异分析
 */
@Injectable()
export class ScreenDiffService {
  private readonly logger = new Logger(ScreenDiffService.name);

  // 差异阈值配置
  private readonly DIFF_THRESHOLD = {
    CRITICAL: 0.5, // 元素变化超过50%触发P1告警
    WARNING: 0.3, // 元素变化超过30%触发P2告警
    INFO: 0.1, // 元素变化超过10%触发P3告警
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * 对比两个界面并生成差异报告
   * 验收标准：
   * 1. 元素新增/移除准确记录
   * 2. 差异超阈值触发告警
   * 3. 支持导出 diff 报告
   */
  async compareScreens(baseScreenId: string, targetScreenId: string): Promise<ScreenDiff> {
    this.logger.log(`Comparing screens: base=${baseScreenId}, target=${targetScreenId}`);

    // 获取两个界面的元素
    const [baseScreen, targetScreen] = await Promise.all([
      this.prisma.screen.findUnique({
        where: { id: baseScreenId },
        include: { elements: true },
      }),
      this.prisma.screen.findUnique({
        where: { id: targetScreenId },
        include: { elements: true },
      }),
    ]);

    if (!baseScreen) {
      throw new NotFoundException(`Base screen with ID ${baseScreenId} not found`);
    }
    if (!targetScreen) {
      throw new NotFoundException(`Target screen with ID ${targetScreenId} not found`);
    }

    // 计算差异
    const diffSummary = this.calculateDiff(baseScreen.elements, targetScreen.elements);

    // 生成详细差异报告
    const diffDetailPath = await this.generateDiffDetailFile(
      baseScreenId,
      targetScreenId,
      diffSummary,
    );

    // 保存差异记录
    const screenDiff = await this.prisma.screenDiff.upsert({
      where: {
        baseScreenId_targetScreenId: {
          baseScreenId,
          targetScreenId,
        },
      },
      create: {
        baseScreenId,
        targetScreenId,
        diffSummary: diffSummary as any,
        diffDetailPath,
      },
      update: {
        diffSummary: diffSummary as any,
        diffDetailPath,
        generatedAt: new Date(),
      },
    });

    // 检查是否需要触发告警
    await this.checkAndTriggerAlert(screenDiff, diffSummary, targetScreen);

    this.logger.log(`Screen diff created: ${screenDiff.id}`);
    return screenDiff;
  }

  /**
   * 计算界面差异
   */
  private calculateDiff(baseElements: any[], targetElements: any[]): any {
    // 构建元素映射（基于 elementHash）
    const baseMap = new Map(baseElements.map((e) => [e.elementHash, e]));
    const targetMap = new Map(targetElements.map((e) => [e.elementHash, e]));

    // 计算新增、删除、修改的元素
    const added: any[] = [];
    const removed: any[] = [];
    const modified: any[] = [];
    const unchanged: any[] = [];

    // 检查新增和修改
    for (const [hash, targetElement] of targetMap) {
      if (!baseMap.has(hash)) {
        added.push({
          elementHash: hash,
          elementType: targetElement.elementType,
          resourceId: targetElement.resourceId,
          textValue: targetElement.textValue,
          bounds: targetElement.bounds,
        });
      } else {
        const baseElement = baseMap.get(hash);
        if (this.isElementModified(baseElement, targetElement)) {
          modified.push({
            elementHash: hash,
            changes: this.getElementChanges(baseElement, targetElement),
          });
        } else {
          unchanged.push({ elementHash: hash });
        }
      }
    }

    // 检查删除
    for (const [hash, baseElement] of baseMap) {
      if (!targetMap.has(hash)) {
        removed.push({
          elementHash: hash,
          elementType: baseElement.elementType,
          resourceId: baseElement.resourceId,
          textValue: baseElement.textValue,
        });
      }
    }

    // 计算变化率
    const totalElements = baseElements.length;
    const changeRate =
      totalElements > 0 ? (added.length + removed.length + modified.length) / totalElements : 0;

    return {
      totalBase: baseElements.length,
      totalTarget: targetElements.length,
      added: added.length,
      removed: removed.length,
      modified: modified.length,
      unchanged: unchanged.length,
      changeRate: Math.round(changeRate * 10000) / 100, // 百分比，保留两位小数
      addedElements: added,
      removedElements: removed,
      modifiedElements: modified,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 检查元素是否被修改
   */
  private isElementModified(baseElement: any, targetElement: any): boolean {
    // 检查关键属性是否变化
    const keyProps = ['textValue', 'contentDesc', 'visibility', 'interactable', 'bounds'];

    for (const prop of keyProps) {
      if (JSON.stringify(baseElement[prop]) !== JSON.stringify(targetElement[prop])) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取元素变化详情
   */
  private getElementChanges(baseElement: any, targetElement: any): any {
    const changes: any = {};

    const props = ['textValue', 'contentDesc', 'visibility', 'interactable', 'bounds'];

    for (const prop of props) {
      const baseValue = baseElement[prop];
      const targetValue = targetElement[prop];

      if (JSON.stringify(baseValue) !== JSON.stringify(targetValue)) {
        changes[prop] = {
          from: baseValue,
          to: targetValue,
        };
      }
    }

    return changes;
  }

  /**
   * 生成详细差异文件
   */
  private async generateDiffDetailFile(
    baseScreenId: string,
    targetScreenId: string,
    diffSummary: any,
  ): Promise<string> {
    // 简化实现：生成文件路径
    // 实际应写入MinIO或文件系统
    const hash = crypto
      .createHash('md5')
      .update(`${baseScreenId}-${targetScreenId}`)
      .digest('hex')
      .substring(0, 8);

    const timestamp = new Date().toISOString().split('T')[0];
    const diffPath = `diffs/${timestamp}/diff_${hash}.json`;

    this.logger.debug(`Generated diff detail path: ${diffPath}`);

    // TODO: 实际写入存储
    // await this.storageService.saveJson(diffPath, diffSummary);

    return diffPath;
  }

  /**
   * 检查并触发告警
   * 验收标准：差异超阈值触发告警
   */
  private async checkAndTriggerAlert(
    screenDiff: ScreenDiff,
    diffSummary: any,
    targetScreen: any,
  ): Promise<void> {
    const changeRate = diffSummary.changeRate / 100; // 转换为小数

    let severity: AlertSeverity | null = null;
    let message = '';

    if (changeRate >= this.DIFF_THRESHOLD.CRITICAL) {
      severity = AlertSeverity.P1;
      message = `界面差异严重：变化率 ${diffSummary.changeRate}%，超过阈值 ${this.DIFF_THRESHOLD.CRITICAL * 100}%`;
    } else if (changeRate >= this.DIFF_THRESHOLD.WARNING) {
      severity = AlertSeverity.P2;
      message = `界面差异警告：变化率 ${diffSummary.changeRate}%，超过阈值 ${this.DIFF_THRESHOLD.WARNING * 100}%`;
    } else if (changeRate >= this.DIFF_THRESHOLD.INFO) {
      severity = AlertSeverity.P3;
      message = `界面差异提示：变化率 ${diffSummary.changeRate}%`;
    }

    if (severity) {
      await this.alertsService.create({
        screenId: targetScreen.id,
        alertType: AlertType.SCREEN_DIFF,
        severity,
        message,
        payload: {
          diffId: screenDiff.id,
          changeRate: diffSummary.changeRate,
          added: diffSummary.added,
          removed: diffSummary.removed,
          modified: diffSummary.modified,
          baseScreenId: screenDiff.baseScreenId,
          targetScreenId: screenDiff.targetScreenId,
        },
      });

      this.logger.warn(`Alert triggered for screen diff: ${screenDiff.id}, severity: ${severity}`);
    }
  }

  /**
   * 查询差异记录
   */
  async findDiff(baseScreenId: string, targetScreenId: string): Promise<ScreenDiff | null> {
    return this.prisma.screenDiff.findUnique({
      where: {
        baseScreenId_targetScreenId: {
          baseScreenId,
          targetScreenId,
        },
      },
      include: {
        baseScreen: {
          select: {
            id: true,
            signature: true,
            primaryText: true,
            capturedAt: true,
          },
        },
        targetScreen: {
          select: {
            id: true,
            signature: true,
            primaryText: true,
            capturedAt: true,
          },
        },
      },
    });
  }

  /**
   * 获取界面的所有差异记录
   */
  async findDiffsByScreen(screenId: string) {
    const [asBase, asTarget] = await Promise.all([
      this.prisma.screenDiff.findMany({
        where: { baseScreenId: screenId },
        include: {
          targetScreen: {
            select: {
              id: true,
              signature: true,
              primaryText: true,
              capturedAt: true,
            },
          },
        },
        orderBy: { generatedAt: 'desc' },
      }),
      this.prisma.screenDiff.findMany({
        where: { targetScreenId: screenId },
        include: {
          baseScreen: {
            select: {
              id: true,
              signature: true,
              primaryText: true,
              capturedAt: true,
            },
          },
        },
        orderBy: { generatedAt: 'desc' },
      }),
    ]);

    return {
      asBase,
      asTarget,
    };
  }

  /**
   * 导出差异报告
   * 验收标准：支持导出 diff 报告
   */
  async exportDiffReport(diffId: string): Promise<{
    diffId: string;
    summary: any;
    detailPath: string;
    exportedAt: string;
  }> {
    const diff = await this.prisma.screenDiff.findUnique({
      where: { id: diffId },
      include: {
        baseScreen: true,
        targetScreen: true,
      },
    });

    if (!diff) {
      throw new NotFoundException(`Screen diff with ID ${diffId} not found`);
    }

    return {
      diffId: diff.id,
      summary: diff.diffSummary,
      detailPath: diff.diffDetailPath || '',
      exportedAt: new Date().toISOString(),
    };
  }
}
