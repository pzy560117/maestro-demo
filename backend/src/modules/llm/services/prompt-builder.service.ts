import { Injectable, Logger } from '@nestjs/common';
import { LlmRequest } from '../types/llm.types';

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
    // TODO: 实现更智能的 DOM 摘要算法
    // 目前简单返回 JSON 字符串（实际应过滤无用节点、压缩属性）

    const summary: string[] = [];
    summary.push('```json');

    try {
      // 简化 DOM，仅保留关键属性
      const simplified = this.simplifyDomNode(domJson);
      summary.push(JSON.stringify(simplified, null, 2));
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Failed to summarize DOM: ${err.message}`);
      summary.push('(DOM 解析失败)');
    }

    summary.push('```');

    return summary.join('\n');
  }

  /**
   * 简化 DOM 节点
   * 仅保留关键信息
   */
  private simplifyDomNode(node: any): any {
    if (!node || typeof node !== 'object') {
      return node;
    }

    const simplified: any = {
      type: node.class || node.type || 'Unknown',
    };

    // 保留关键属性
    if (node['resource-id']) {
      simplified.id = node['resource-id'];
    }
    if (node.text) {
      simplified.text = node.text;
    }
    if (node['content-desc']) {
      simplified.desc = node['content-desc'];
    }
    if (node.clickable === 'true' || node.clickable === true) {
      simplified.clickable = true;
    }
    if (node.bounds) {
      simplified.bounds = node.bounds;
    }

    // 递归处理子节点（限制深度）
    if (node.children && Array.isArray(node.children)) {
      simplified.children = node.children
        .slice(0, 10) // 最多保留 10 个子节点
        .map((child: any) => this.simplifyDomNode(child));
    }

    return simplified;
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
      this.logger.warn(
        `Prompt too long: ${estimatedTokens} tokens (max: ${maxTokens})`,
      );
      return false;
    }

    return true;
  }
}

