import { Injectable, Logger } from '@nestjs/common';
import { LlmRequest } from '../types/llm.types';
import { VisionSnapshot, VisionElementSummary } from '../../common/types/vision.types';

/**
 * Prompt 构建器服务
 * 实现功能 D：LLM 指令生成（FR-03）
 *
 * 职责：
 * 1. 组装 system/user/context 提示词
 * 2. 控制 token 数量在限制范围内
 * 3. 提供多模态支持（文本+截图）
 */
@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  /**
   * 系统提示词模板
   * 定义 LLM 的角色和行为准则
   */
  private readonly systemPromptTemplate = `你是一个专业的 Android UI 自动化测试助手。你的任务是分析当前界面截图和 DOM 结构，决策下一步应该执行的测试动作。

## 角色定位
- 你是一名经验丰富的 QA 工程师
- 你精通 Android UI 自动化测试
- 你的目标是最大化界面覆盖率，探索应用的所有功能

## 行为准则
1. **优先探索未访问的界面**：选择可能跳转到新界面的交互元素
2. **避免破坏性操作**：不要执行删除、支付、注销等敏感操作
3. **遵守动作白名单**：仅返回白名单中允许的动作类型
4. **提供清晰的推理**：说明为什么选择该动作
5. **评估置信度**：根据元素可见性和语义清晰度评分

## 输出格式
请严格按照以下 JSON Schema 返回：
\`\`\`json
{
  "actionPlan": {
    "actionType": "CLICK | INPUT | SCROLL | NAVIGATE",
    "params": {
      "target": "元素描述或坐标",
      "text": "输入文本（仅 INPUT 需要）",
      "direction": "滚动方向（仅 SCROLL 需要）"
    },
    "description": "动作描述",
    "expectedOutcome": "预期结果",
    "confidence": 0.8
  },
  "reasoning": "推理过程",
  "screenAnalysis": {
    "screenType": "登录 | 列表 | 详情 | 设置等",
    "keyElements": ["元素1", "元素2"],
    "interactableCount": 5
  }
}
\`\`\``;

  /**
   * 构建 LLM 请求 Prompt
   */
  buildPrompt(request: LlmRequest): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const systemPrompt = request.systemPrompt || this.systemPromptTemplate;

    const userPrompt = this.buildUserPrompt(request);

    this.logger.debug(
      `Prompt built, estimated tokens: ${this.estimateTokens(systemPrompt + userPrompt)}`,
    );

    return {
      systemPrompt,
      userPrompt,
    };
  }

  /**
   * 构建用户提示词
   * 包含当前界面信息、历史操作、白名单
   */
  private buildUserPrompt(request: LlmRequest): string {
    const sections: string[] = [];

    // 1. 任务上下文
    sections.push(`## 任务信息`);
    sections.push(`- 任务运行ID: ${request.taskRunId}`);
    if (request.screenId) {
      sections.push(`- 当前界面ID: ${request.screenId}`);
    }
    sections.push('');

    // 2. 动作白名单
    sections.push(`## 允许的动作类型`);
    sections.push(request.allowedActions.map((a) => `- ${a}`).join('\n'));
    sections.push('');

    // 3. 历史操作（最近 5 条）
    if (request.historyActions && request.historyActions.length > 0) {
      sections.push(`## 最近操作历史`);
      const recentActions = request.historyActions.slice(-5);
      recentActions.forEach((action, index) => {
        sections.push(
          `${index + 1}. [${action.timestamp}] ${action.action}: ${action.description}`,
        );
      });
      sections.push('');
    }

    // 4. DOM 结构（如果提供）
    if (request.domJson) {
      sections.push(`## 界面 DOM 结构`);
      sections.push(this.summarizeDom(request.domJson));
      sections.push('');
    }

    // 4.1 视觉摘要（如果提供）
    if (request.visionSummary && request.visionSummary.elements.length > 0) {
      sections.push(`## 视觉摘要`);
      sections.push(this.summarizeVision(request.visionSummary));
      sections.push('');
    }

    // 5. 指令
    sections.push(`## 任务`);
    sections.push(
      request.userPrompt ||
        '请分析当前界面截图（附件），结合 DOM 结构和历史操作，决策下一步应执行的动作。',
    );
    sections.push('');

    // 6. 提醒
    sections.push(`## 注意事项`);
    sections.push(`- 优先选择可能跳转到新界面的操作`);
    sections.push(`- 避免重复点击已访问过的界面`);
    sections.push(`- 如果界面无可点击元素，返回 NAVIGATE back 动作`);
    sections.push(`- 对于输入框，填入合理的测试数据`);

    return sections.join('\n');
  }

  /**
   * 总结 DOM 结构
   * 提取关键元素信息，减少 token 消耗
   */
  private summarizeDom(domJson: any): string {
    const summary: string[] = [];
    summary.push('```json');

    try {
      const domSummary = this.buildDomSummary(domJson);
      summary.push(JSON.stringify(domSummary, null, 2));
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Failed to summarize DOM: ${err.message}`);
      summary.push('(DOM 解析失败)');
    }

    summary.push('```');

    return summary.join('\n');
  }

  /**
   * 总结视觉要素
   */
  private summarizeVision(snapshot: VisionSnapshot): string {
    const summary: Record<string, any> = {
      provider: snapshot.provider,
      analyzedAt: snapshot.analyzedAt,
      totalElements: snapshot.totalElements,
      sampledElements: this.selectVisionElements(snapshot.elements),
    };

    return ['```json', JSON.stringify(summary, null, 2), '```'].join('\n');
  }

  /**
   * 选择代表性视觉元素
   */
  private selectVisionElements(elements: VisionElementSummary[]): any[] {
    const maxItems = 12;
    return elements.slice(0, maxItems).map((el) => {
      const item: Record<string, any> = {};

      if (el.type) {
        item.type = el.type;
      }
      if (el.text) {
        item.text = this.normalizeVisionText(el.text);
      }
      if (el.bbox) {
        item.bbox = el.bbox;
      }
      if (typeof el.confidence === 'number') {
        item.confidence = Number(el.confidence.toFixed(3));
      }

      return item;
    });
  }

  /**
   * 视觉文本裁剪
   */
  private normalizeVisionText(text: string): string {
    const trimmed = text.trim();
    const maxLength = 60;
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
  }

  /**
   * 简化 DOM 节点
   * 仅保留关键信息
   */
  private buildDomSummary(domJson: any): Record<string, any> {
    /**
     * DOM 摘要结构体
     */
    interface DomSummary {
      totalNodes: number;
      clickableCount: number;
      textNodeCount: number;
      keyElements: Array<Record<string, any>>;
    }

    const summary: DomSummary = {
      totalNodes: 0,
      clickableCount: 0,
      textNodeCount: 0,
      keyElements: [],
    };

    const maxDepth = 4;
    const maxChildrenPerNode = 6;
    const maxKeyElements = 50;

    const queue: Array<{ node: any; depth: number; path: string[] }> = [];
    queue.push({ node: domJson, depth: 0, path: [] });

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      const { node, depth, path } = current;

      if (!node || typeof node !== 'object') {
        continue;
      }

      summary.totalNodes += 1;

      const type = (node.class || node.type || 'Unknown') as string;
      const resourceId = this.normalizeText(node['resource-id']);
      const text = this.normalizeText(node.text);
      const contentDesc = this.normalizeText(node['content-desc']);
      const clickable = this.isTruthy(node.clickable);

      if (text) {
        summary.textNodeCount += 1;
      }
      if (clickable) {
        summary.clickableCount += 1;
      }

      const isInput = this.isInputNode(type, node);
      const useful = clickable || isInput || !!resourceId || !!text || !!contentDesc;

      if (useful && summary.keyElements.length < maxKeyElements) {
        const elementSummary: Record<string, any> = {
          path: this.buildDomPath(path, type),
          type,
          depth,
        };

        if (resourceId) {
          elementSummary.id = resourceId;
        }
        if (text) {
          elementSummary.text = text;
        }
        if (contentDesc) {
          elementSummary.desc = contentDesc;
        }
        if (clickable) {
          elementSummary.clickable = true;
        }
        if (node.bounds) {
          elementSummary.bounds = node.bounds;
        }
        if (isInput) {
          elementSummary.input = true;
        }

        summary.keyElements.push(elementSummary);
      }

      if (depth >= maxDepth) {
        continue;
      }

      const children = Array.isArray(node.children) ? node.children : [];
      for (let i = 0; i < children.length && i < maxChildrenPerNode; i += 1) {
        queue.push({
          node: children[i],
          depth: depth + 1,
          path: [...path, type],
        });
      }
    }

    return summary;
  }

  /**
   * 构建 DOM 路径字符串
   */
  private buildDomPath(path: string[], currentType: string): string {
    const fullPath = [...path, currentType];
    return fullPath.slice(-5).join(' > ');
  }

  /**
   * 判断节点是否可视为输入组件
   */
  private isInputNode(type: string, node: any): boolean {
    const lowered = type.toLowerCase();
    return (
      lowered.includes('edittext') ||
      lowered.includes('input') ||
      this.isTruthy(node.focusable) ||
      this.isTruthy(node.password)
    );
  }

  /**
   * 归一化文本内容，去除空白并限制长度
   */
  private normalizeText(value: any): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const maxLength = 60;
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
  }

  /**
   * 判断布尔字段是否为真
   */
  private isTruthy(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return false;
  }

  /**
   * 估算 token 数量
   * 粗略估计：中文 ~1.5 tokens/字，英文 ~0.25 tokens/词
   */
  private estimateTokens(text: string): number {
    // 简化估算：中文字符 * 1.5 + 英文单词 * 0.25
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

    return Math.ceil(chineseChars * 1.5 + englishWords * 0.25);
  }

  /**
   * 校验 Prompt 长度
   * 确保不超过模型限制
   */
  validatePromptLength(prompt: string, maxTokens: number): boolean {
    const estimatedTokens = this.estimateTokens(prompt);

    if (estimatedTokens > maxTokens) {
      this.logger.warn(`Prompt too long: ${estimatedTokens} tokens (max: ${maxTokens})`);
      return false;
    }

    return true;
  }
}
