import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * 界面签名服务
 * 功能 G：界面签名与存档（FR-09）
 * 
 * 职责：
 * 1. 生成界面签名（基于截图、DOM、主文案）
 * 2. 计算哈希值
 * 3. 确保同一界面生成相同签名
 * 
 * 验收标准：
 * 1. 同一界面多次访问生成相同签名
 * 2. 签名唯一且稳定
 */
@Injectable()
export class ScreenSignatureService {
  private readonly logger = new Logger(ScreenSignatureService.name);

  /**
   * 生成界面签名
   * 
   * @param screenshotHash - 截图文件哈希
   * @param domHash - DOM 结构哈希
   * @param primaryText - 主要文案（可选）
   * @returns 界面签名（SHA-256）
   */
  generateSignature(
    screenshotHash: string,
    domHash: string,
    primaryText?: string,
  ): string {
    // 组合关键信息
    const components = [
      screenshotHash,
      domHash,
      primaryText || '',
    ].filter(Boolean);

    // 生成签名
    const signature = this.computeHash(components.join('::'));

    this.logger.debug(`Generated signature: ${signature} from ${components.length} components`);

    return signature;
  }

  /**
   * 计算文件哈希（用于截图）
   * 
   * @param buffer - 文件内容
   * @returns SHA-256 哈希
   */
  computeFileHash(buffer: Buffer): string {
    return this.computeHash(buffer);
  }

  /**
   * 计算 DOM 哈希
   * 规范化 DOM 结构，忽略动态属性
   * 
   * @param domData - DOM 数据对象
   * @returns SHA-256 哈希
   */
  computeDomHash(domData: any): string {
    // 规范化 DOM 数据：移除时间戳、坐标等动态属性
    const normalized = this.normalizeDom(domData);

    // 转为稳定的 JSON 字符串
    const jsonString = JSON.stringify(normalized, Object.keys(normalized).sort());

    return this.computeHash(jsonString);
  }

  /**
   * 提取主要文案
   * 从 DOM 中提取页面标题、主按钮等关键文本
   * 
   * @param domData - DOM 数据对象
   * @returns 主要文案
   */
  extractPrimaryText(domData: any): string | null {
    const texts: string[] = [];

    // 递归遍历 DOM 树，提取文本
    const traverse = (node: any) => {
      if (!node) return;

      // 提取文本内容
      if (node.text && typeof node.text === 'string' && node.text.trim()) {
        texts.push(node.text.trim());
      }

      // 提取内容描述
      if (node.contentDesc && typeof node.contentDesc === 'string' && node.contentDesc.trim()) {
        texts.push(node.contentDesc.trim());
      }

      // 遍历子节点
      if (Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
    };

    traverse(domData);

    // 取前 5 个文本，去重后拼接
    const uniqueTexts = [...new Set(texts)].slice(0, 5);

    return uniqueTexts.length > 0 ? uniqueTexts.join(' | ') : null;
  }

  /**
   * 规范化 DOM 数据
   * 移除动态属性，保留结构信息
   */
  private normalizeDom(node: any): any {
    if (!node || typeof node !== 'object') {
      return node;
    }

    const normalized: any = {};

    // 保留关键属性
    const keysToKeep = [
      'class',
      'resource-id',
      'content-desc',
      'text',
      'checkable',
      'clickable',
      'enabled',
      'focusable',
      'long-clickable',
      'scrollable',
      'selected',
    ];

    for (const key of keysToKeep) {
      if (key in node && node[key] !== null && node[key] !== undefined) {
        normalized[key] = node[key];
      }
    }

    // 递归处理子节点
    if (Array.isArray(node.children) && node.children.length > 0) {
      normalized.children = node.children.map((child: any) => this.normalizeDom(child));
    }

    return normalized;
  }

  /**
   * 计算哈希值（统一方法）
   */
  private computeHash(input: string | Buffer): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * 计算元素哈希
   * 用于元素去重和版本管理
   * 
   * @param element - 元素数据
   * @returns SHA-256 哈希
   */
  computeElementHash(element: {
    elementType: string;
    resourceId?: string | null;
    contentDesc?: string | null;
    textValue?: string | null;
    bounds: any;
  }): string {
    const components = [
      element.elementType,
      element.resourceId || '',
      element.contentDesc || '',
      element.textValue || '',
      JSON.stringify(element.bounds),
    ];

    return this.computeHash(components.join('::'));
  }
}

