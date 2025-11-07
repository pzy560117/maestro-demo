import { Injectable, Logger } from '@nestjs/common';
import { AppiumRealService } from './appium-real.service';

/**
 * 设备操作接口
 */
export interface DeviceAction {
  type: 'click' | 'input' | 'scroll' | 'swipe' | 'back' | 'home';
  params?: Record<string, any>;
}

/**
 * Appium 集成服务（统一接口）
 * 功能 F：设备操作（FR-08）
 *
 * 职责：
 * 1. 连接 Android 设备
 * 2. 安装 APK
 * 3. 启动应用
 * 4. 截图
 * 5. 获取 DOM 树
 * 6. 执行动作（点击、输入、滚动等）
 * 7. 验证元素定位
 *
 * 说明：
 * - 使用真实 Appium WebDriver 实现
 * - 支持通过环境变量启用/禁用
 */
@Injectable()
export class AppiumService {
  private readonly logger = new Logger(AppiumService.name);
  private readonly enabled: boolean;

  constructor(private readonly realService: AppiumRealService) {
    // 默认启用，除非明确设置为 false
    this.enabled = process.env.APPIUM_ENABLED !== 'false';

    if (this.enabled) {
      this.logger.log('Appium service enabled - using real WebDriver implementation');
    } else {
      this.logger.warn('Appium service disabled - set APPIUM_ENABLED=true to enable');
    }
  }

  /**
   * 创建会话（连接设备）
   */
  async createSession(
    deviceSerial: string,
    appPackage: string,
    appActivity?: string,
  ): Promise<string> {
    if (!this.enabled) {
      throw new Error('Appium is disabled. Set APPIUM_ENABLED=true to use real device automation');
    }
    return this.realService.createSession(deviceSerial, appPackage, appActivity);
  }

  /**
   * 关闭会话
   */
  async closeSession(sessionId: string): Promise<void> {
    if (!this.enabled) {
      return;
    }
    return this.realService.closeSession(sessionId);
  }

  /**
   * 安装 APK
   */
  async installApp(sessionId: string, apkPath: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('Appium is disabled');
    }
    return this.realService.installApp(sessionId, apkPath);
  }

  /**
   * 启动应用
   */
  async launchApp(sessionId: string, appPackage: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('Appium is disabled');
    }
    return this.realService.launchApp(sessionId, appPackage);
  }

  /**
   * 截图
   */
  async takeScreenshot(sessionId: string): Promise<Buffer> {
    if (!this.enabled) {
      throw new Error('Appium is disabled');
    }
    return this.realService.takeScreenshot(sessionId);
  }

  /**
   * 获取 DOM 树（页面源码）
   */
  async getPageSource(sessionId: string): Promise<any> {
    if (!this.enabled) {
      throw new Error('Appium is disabled');
    }
    return this.realService.getPageSource(sessionId);
  }

  /**
   * 执行点击
   */
  async click(sessionId: string, locator: string, strategy: string): Promise<boolean> {
    if (!this.enabled) {
      throw new Error('Appium is disabled');
    }
    return this.realService.click(sessionId, locator, strategy);
  }

  /**
   * 输入文本
   */
  async input(
    sessionId: string,
    locator: string,
    strategy: string,
    text: string,
  ): Promise<boolean> {
    if (!this.enabled) {
      throw new Error('Appium is disabled');
    }
    return this.realService.input(sessionId, locator, strategy, text);
  }

  /**
   * 滚动
   */
  async scroll(sessionId: string, direction: string, distance?: number): Promise<boolean> {
    if (!this.enabled) {
      throw new Error('Appium is disabled');
    }
    return this.realService.scroll(sessionId, direction, distance);
  }

  /**
   * 返回上一页
   */
  async back(sessionId: string): Promise<boolean> {
    if (!this.enabled) {
      throw new Error('Appium is disabled');
    }
    return this.realService.back(sessionId);
  }

  /**
   * 高亮元素（用于验证）
   */
  async highlightElement(sessionId: string, locator: string, strategy: string): Promise<boolean> {
    if (!this.enabled) {
      throw new Error('Appium is disabled');
    }
    return this.realService.highlightElement(sessionId, locator, strategy);
  }

  /**
   * 检查元素是否可见
   */
  async isElementDisplayed(sessionId: string, locator: string, strategy: string): Promise<boolean> {
    if (!this.enabled) {
      throw new Error('Appium is disabled');
    }
    return this.realService.isElementDisplayed(sessionId, locator, strategy);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; enabled: boolean; sessionCount: number }> {
    if (!this.enabled) {
      return {
        status: 'disabled',
        enabled: false,
        sessionCount: 0,
      };
    }
    return this.realService.healthCheck();
  }

  /**
   * 获取所有会话
   */
  getSessions(): string[] {
    if (!this.enabled) {
      return [];
    }
    return this.realService.getSessions();
  }
}
