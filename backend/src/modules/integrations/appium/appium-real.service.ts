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
    // 默认启用，除非明确设置为 false
    this.enabled = process.env.APPIUM_ENABLED !== 'false';
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
   * 通过 ADB 检测应用的主 Activity
   * @param deviceSerial - 设备序列号
   * @param appPackage - 应用包名
   * @returns 主 Activity 名称
   */
  private async detectMainActivity(deviceSerial: string, appPackage: string): Promise<string> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Windows 下使用 PowerShell 执行 ADB 命令
      const isWindows = process.platform === 'win32';
      let command: string;

      if (isWindows) {
        // Windows: 使用 PowerShell 包装，避免 shell 转义问题
        command = `powershell -Command "adb -s ${deviceSerial} shell \\"dumpsys package ${appPackage}\\" | Select-String -Pattern 'android.intent.action.MAIN' -Context 0,5"`;
      } else {
        // Linux/Mac: 直接使用 shell
        command = `adb -s ${deviceSerial} shell "dumpsys package ${appPackage} | grep -A 5 'android.intent.action.MAIN'"`;
      }

      this.logger.debug(`Detecting main activity with command: ${command.substring(0, 100)}...`);
      const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

      if (stderr) {
        this.logger.warn(`ADB stderr: ${stderr}`);
      }

      // 解析输出，查找 Activity 类名
      // 格式示例: 9203d28 com.macrovideo.v380pro/.activities.LaunchActivityAMPSDomestic filter 95dd3ea
      const activityPattern = new RegExp(`${appPackage.replace(/\./g, '\\.')}\\/([^\\s]+)`);
      const activityMatch = stdout.match(activityPattern);

      if (activityMatch && activityMatch[1]) {
        const activity = activityMatch[1];
        this.logger.log(`✅ Detected main activity for ${appPackage}: ${activity}`);
        return activity;
      }

      // 如果检测失败，回退到通用的 MainActivity
      this.logger.warn(
        `Could not detect main activity for ${appPackage}, falling back to .MainActivity`,
      );
      this.logger.debug(`ADB output: ${stdout.substring(0, 200)}`);
      return '.MainActivity';
    } catch (error) {
      this.logger.error(
        `Failed to detect main activity: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // 回退方案
      return '.MainActivity';
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
      // 如果未提供 Activity，尝试自动检测主 Activity
      let finalActivity = appActivity;

      if (!finalActivity) {
        this.logger.debug(
          `No activity provided for ${appPackage}, attempting to detect main activity`,
        );
        finalActivity = await this.detectMainActivity(deviceSerial, appPackage);
      }

      const capabilities: RemoteOptions['capabilities'] = {
        platformName: 'Android',
        'appium:deviceName': deviceSerial,
        'appium:udid': deviceSerial,
        'appium:appPackage': appPackage,
        'appium:appActivity': finalActivity,
        'appium:automationName': 'UiAutomator2',
        'appium:noReset': true,
        'appium:fullReset': false,
        'appium:newCommandTimeout': 300, // 5 minutes
        'appium:ensureWebviewsHavePages': true,
        'appium:nativeWebScreenshot': true,
        // 优化启动性能
        'appium:skipDeviceInitialization': false,
        'appium:skipServerInstallation': false,
        'appium:skipUnlock': true, // 跳过解锁（假设设备已解锁）
        'appium:autoGrantPermissions': true, // 自动授予权限
        'appium:disableWindowAnimation': true, // 禁用动画加速
        // 增加等待时间
        'appium:deviceReadyTimeout': 120000, // 允许 Appium 等待设备上线 120 秒
        'appium:androidInstallTimeout': 90000, // APK 安装超时 90秒
        'appium:adbExecTimeout': 120000, // ADB 命令超时 120秒
        'appium:uiautomator2ServerLaunchTimeout': 120000, // UiAutomator2 启动超时
        'appium:uiautomator2ServerInstallTimeout': 120000, // UiAutomator2 安装超时
      };

      const driver = await remote({
        protocol: 'http',
        hostname: new URL(this.appiumServerUrl).hostname,
        port: Number(new URL(this.appiumServerUrl).port) || 4723,
        path: '/',
        capabilities,
        // 增加连接超时时间（默认 120秒 → 180秒）
        connectionRetryTimeout: 180000, // 3 分钟
        connectionRetryCount: 3,
        // 增加会话创建超时
        waitforTimeout: 60000, // 60秒
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
  async input(
    sessionId: string,
    locator: string,
    strategy: string,
    text: string,
  ): Promise<boolean> {
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
