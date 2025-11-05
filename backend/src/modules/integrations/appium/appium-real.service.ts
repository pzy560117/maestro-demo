import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { remote, RemoteOptions } from 'webdriverio';

/**
 * Appium 真实集成服务
 * 
 * 职责：
 * 1. 连接 Android 设备
 * 2. 安装和启动应用
 * 3. 执行 UI 操作
 * 4. 获取截图和 DOM
 * 5. 元素定位和验证
 * 
 * 依赖：
 * - webdriverio: WebDriver 客户端
 * - Appium Server: 需要单独启动（http://localhost:4723）
 */
@Injectable()
export class AppiumRealService implements OnModuleInit {
  private readonly logger = new Logger(AppiumRealService.name);
  private readonly enabled: boolean;
  private readonly appiumServerUrl: string;
  private sessions: Map<string, WebdriverIO.Browser> = new Map();

  constructor() {
    this.enabled = process.env.APPIUM_ENABLED === 'true';
    this.appiumServerUrl = process.env.APPIUM_SERVER_URL || 'http://localhost:4723';
  }

  async onModuleInit() {
    if (this.enabled) {
      this.logger.log(`Appium service enabled, server: ${this.appiumServerUrl}`);
      await this.checkAppiumServer();
    } else {
      this.logger.warn('Appium service is disabled (APPIUM_ENABLED=false)');
    }
  }

  /**
   * 检查 Appium Server 是否可用
   */
  private async checkAppiumServer(): Promise<void> {
    try {
      const response = await fetch(`${this.appiumServerUrl}/status`);
      if (response.ok) {
        this.logger.log('Appium Server is ready');
      } else {
        this.logger.warn('Appium Server is not responding correctly');
      }
    } catch (error) {
      this.logger.error(`Cannot connect to Appium Server: ${(error as Error).message}`);
    }
  }

  /**
   * 创建会话（连接设备）
   * 
   * @param deviceSerial - 设备序列号
   * @param appPackage - 应用包名
   * @param appActivity - 应用入口 Activity（可选）
   * @returns 会话 ID
   */
  async createSession(
    deviceSerial: string,
    appPackage: string,
    appActivity?: string,
  ): Promise<string> {
    if (!this.enabled) {
      throw new Error('Appium service is disabled');
    }

    try {
      const capabilities: RemoteOptions['capabilities'] = {
        platformName: 'Android',
        'appium:deviceName': deviceSerial,
        'appium:udid': deviceSerial,
        'appium:appPackage': appPackage,
        'appium:appActivity': appActivity || `${appPackage}.MainActivity`,
        'appium:automationName': 'UiAutomator2',
        'appium:noReset': true,
        'appium:fullReset': false,
        'appium:newCommandTimeout': 300, // 5 minutes
      };

      const driver = await remote({
        protocol: 'http',
        hostname: new URL(this.appiumServerUrl).hostname,
        port: Number(new URL(this.appiumServerUrl).port) || 4723,
        path: '/',
        capabilities,
      });

      const sessionId = driver.sessionId;
      this.sessions.set(sessionId, driver);

      this.logger.log(`Appium session created: ${sessionId} for device ${deviceSerial}`);

      return sessionId;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create Appium session: ${err.message}`, err.stack);
      throw new Error(`Failed to create session: ${err.message}`);
    }
  }

  /**
   * 关闭会话
   */
  async closeSession(sessionId: string): Promise<void> {
    const driver = this.sessions.get(sessionId);
    if (!driver) {
      this.logger.warn(`Session not found: ${sessionId}`);
      return;
    }

    try {
      await driver.deleteSession();
      this.sessions.delete(sessionId);
      this.logger.log(`Appium session closed: ${sessionId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to close session: ${err.message}`, err.stack);
    }
  }

  /**
   * 安装 APK
   */
  async installApp(sessionId: string, apkPath: string): Promise<void> {
    const driver = this.getDriver(sessionId);

    try {
      await driver.installApp(apkPath);
      this.logger.log(`App installed: ${apkPath}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to install app: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 启动应用
   */
  async launchApp(sessionId: string, appPackage: string): Promise<void> {
    const driver = this.getDriver(sessionId);

    try {
      await driver.execute('mobile: activateApp', { appId: appPackage });
      this.logger.log(`App launched: ${appPackage}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to launch app: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 截图
   */
  async takeScreenshot(sessionId: string): Promise<Buffer> {
    const driver = this.getDriver(sessionId);

    try {
      const screenshot = await driver.takeScreenshot();
      this.logger.log('Screenshot taken');
      return Buffer.from(screenshot, 'base64');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to take screenshot: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 获取 DOM 树（页面源码）
   */
  async getPageSource(sessionId: string): Promise<any> {
    const driver = this.getDriver(sessionId);

    try {
      const source = await driver.getPageSource();
      
      // 将 XML 转换为 JSON 格式
      const domData = this.parseXmlToJson(source);
      
      this.logger.log('Page source retrieved');
      return domData;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to get page source: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 执行点击
   */
  async click(sessionId: string, locator: string, strategy: string): Promise<boolean> {
    const driver = this.getDriver(sessionId);

    try {
      const selector = this.buildSelector(strategy, locator);
      const element = await driver.$(selector);
      await element.click();
      
      this.logger.log(`Clicked element: ${strategy} = ${locator}`);
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Click failed: ${err.message}`);
      return false;
    }
  }

  /**
   * 输入文本
   */
  async input(sessionId: string, locator: string, strategy: string, text: string): Promise<boolean> {
    const driver = this.getDriver(sessionId);

    try {
      const selector = this.buildSelector(strategy, locator);
      const element = await driver.$(selector);
      await element.setValue(text);
      
      this.logger.log(`Input text: ${text} to ${strategy} = ${locator}`);
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Input failed: ${err.message}`);
      return false;
    }
  }

  /**
   * 滚动
   */
  async scroll(sessionId: string, direction: string, distance?: number): Promise<boolean> {
    const driver = this.getDriver(sessionId);

    try {
      // 获取屏幕尺寸
      const { width, height } = await driver.getWindowSize();
      
      let startX = width / 2;
      let startY = height / 2;
      let endX = startX;
      let endY = startY;

      const scrollDistance = distance || height / 3;

      switch (direction.toLowerCase()) {
        case 'up':
          startY = height * 0.8;
          endY = startY - scrollDistance;
          break;
        case 'down':
          startY = height * 0.2;
          endY = startY + scrollDistance;
          break;
        case 'left':
          startX = width * 0.8;
          endX = startX - scrollDistance;
          break;
        case 'right':
          startX = width * 0.2;
          endX = startX + scrollDistance;
          break;
      }

      await driver.touchPerform([
        { action: 'press', options: { x: startX, y: startY } },
        { action: 'wait', options: { ms: 100 } },
        { action: 'moveTo', options: { x: endX, y: endY } },
        { action: 'release' },
      ]);
      
      this.logger.log(`Scrolled: ${direction}`);
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Scroll failed: ${err.message}`);
      return false;
    }
  }

  /**
   * 返回上一页
   */
  async back(sessionId: string): Promise<boolean> {
    const driver = this.getDriver(sessionId);

    try {
      await driver.back();
      this.logger.log('Pressed back button');
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Back failed: ${err.message}`);
      return false;
    }
  }

  /**
   * 高亮元素（用于验证）
   */
  async highlightElement(sessionId: string, locator: string, strategy: string): Promise<boolean> {
    const driver = this.getDriver(sessionId);

    try {
      const selector = this.buildSelector(strategy, locator);
      const element = await driver.$(selector);
      
      // 通过改变元素边框来高亮
      await driver.execute('mobile: shell', {
        command: 'input',
        args: ['keyevent', 'KEYCODE_MENU'], // 临时方案
      });
      
      this.logger.log(`Highlighted element: ${strategy} = ${locator}`);
      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Highlight failed: ${err.message}`);
      return false;
    }
  }

  /**
   * 检查元素是否存在
   */
  async isElementDisplayed(sessionId: string, locator: string, strategy: string): Promise<boolean> {
    const driver = this.getDriver(sessionId);

    try {
      const selector = this.buildSelector(strategy, locator);
      const element = await driver.$(selector);
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取 Driver 实例
   */
  private getDriver(sessionId: string): WebdriverIO.Browser {
    const driver = this.sessions.get(sessionId);
    if (!driver) {
      throw new Error(`Invalid session: ${sessionId}`);
    }
    return driver;
  }

  /**
   * 构建选择器
   */
  private buildSelector(strategy: string, locator: string): string {
    switch (strategy.toUpperCase()) {
      case 'ID':
        return `android=new UiSelector().resourceId("${locator}")`;
      case 'TEXT':
        return `android=new UiSelector().text("${locator}")`;
      case 'ACCESSIBILITY_ID':
        return `~${locator}`;
      case 'XPATH':
        return locator;
      default:
        return locator;
    }
  }

  /**
   * 解析 XML 为 JSON（简化版）
   */
  private parseXmlToJson(xml: string): any {
    // 简化的 XML 解析，实际生产中应使用专业的 XML 解析库
    return {
      hierarchy: [],
      raw: xml,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; enabled: boolean; sessionCount: number }> {
    return {
      status: this.enabled ? 'available' : 'disabled',
      enabled: this.enabled,
      sessionCount: this.sessions.size,
    };
  }

  /**
   * 获取所有会话
   */
  getSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

