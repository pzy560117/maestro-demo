/**
 * Appium PoC验证脚本
 * 用途：验证Appium环境配置是否正确
 * 
 * 运行前确保：
 * 1. Appium Server已启动 (appium)
 * 2. Android设备/模拟器已连接并在线
 * 3. 已安装必要依赖 (pnpm install)
 */

import { remote } from 'webdriverio';

interface AppiumCapabilities {
  platformName: string;
  'appium:deviceName': string;
  'appium:platformVersion': string;
  'appium:automationName': string;
  'appium:appPackage'?: string;
  'appium:appActivity'?: string;
  'appium:noReset'?: boolean;
}

/**
 * Appium连接配置
 */
const capabilities: AppiumCapabilities = {
  platformName: 'Android',
  'appium:deviceName': process.env.DEVICE_NAME || 'emulator-5554',
  'appium:platformVersion': process.env.PLATFORM_VERSION || '13',
  'appium:automationName': 'UiAutomator2',
  'appium:appPackage': 'com.android.settings', // 使用系统设置作为测试应用
  'appium:appActivity': '.Settings',
  'appium:noReset': true,
};

/**
 * 主测试流程
 */
async function runAppiumTest() {
  console.log('🚀 Starting Appium PoC Test...\n');

  let driver;

  try {
    // 连接到Appium Server
    console.log('📱 Connecting to Appium Server...');
    driver = await remote({
      protocol: 'http',
      hostname: process.env.APPIUM_HOST || 'localhost',
      port: parseInt(process.env.APPIUM_PORT || '4723'),
      path: '/',
      capabilities,
    });

    console.log('✅ Connected to Appium Server\n');

    // 测试1: 获取设备信息
    console.log('📋 Test 1: Get Device Info');
    const deviceInfo = await driver.getCapabilities();
    console.log('  Device Name:', deviceInfo['appium:deviceName']);
    console.log('  Platform:', deviceInfo.platformName);
    console.log('  Platform Version:', deviceInfo['appium:platformVersion']);
    console.log('  Automation Name:', deviceInfo['appium:automationName']);
    console.log('  ✓ Device info retrieved\n');

    // 测试2: 获取当前应用信息
    console.log('📋 Test 2: Get Current App Info');
    const currentPackage = await driver.getCurrentPackage();
    const currentActivity = await driver.getCurrentActivity();
    console.log('  Current Package:', currentPackage);
    console.log('  Current Activity:', currentActivity);
    console.log('  ✓ App info retrieved\n');

    // 测试3: 获取屏幕尺寸
    console.log('📋 Test 3: Get Window Size');
    const windowSize = await driver.getWindowSize();
    console.log('  Screen Size:', `${windowSize.width}x${windowSize.height}`);
    console.log('  ✓ Window size retrieved\n');

    // 测试4: 获取页面源代码（XML DOM）
    console.log('📋 Test 4: Get Page Source');
    const pageSource = await driver.getPageSource();
    const domLength = pageSource.length;
    const elementCount = (pageSource.match(/<node/g) || []).length;
    console.log('  DOM Length:', domLength, 'characters');
    console.log('  Element Count:', elementCount, 'nodes');
    console.log('  ✓ Page source retrieved\n');

    // 测试5: 查找元素（示例）
    console.log('📋 Test 5: Find Elements');
    const elements = await driver.$$('//android.widget.TextView');
    console.log('  Found TextViews:', elements.length);
    if (elements.length > 0) {
      const firstElementText = await elements[0].getText();
      console.log('  First TextView Text:', firstElementText);
    }
    console.log('  ✓ Elements found\n');

    // 测试6: 截图
    console.log('📋 Test 6: Take Screenshot');
    const screenshot = await driver.takeScreenshot();
    const screenshotSize = Buffer.from(screenshot, 'base64').length;
    console.log('  Screenshot Size:', (screenshotSize / 1024).toFixed(2), 'KB');
    console.log('  ✓ Screenshot captured\n');

    console.log('🎉 All tests passed!\n');
    console.log('✅ Appium环境验证成功！');
    console.log('可以开始开发遍历任务调度器。\n');

    return {
      success: true,
      deviceInfo: {
        name: deviceInfo['appium:deviceName'],
        platform: deviceInfo.platformName,
        version: deviceInfo['appium:platformVersion'],
        screenSize: `${windowSize.width}x${windowSize.height}`,
      },
      tests: {
        connection: true,
        deviceInfo: true,
        appInfo: true,
        windowSize: true,
        pageSource: true,
        findElements: true,
        screenshot: true,
      },
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.error('\n💡 提示: Appium Server未启动，请运行 "appium" 启动服务\n');
    } else if (error.message?.includes('device')) {
      console.error('\n💡 提示: 设备未连接或不可用，请检查 "adb devices"\n');
    }
    
    return {
      success: false,
      error: error.message,
    };
  } finally {
    // 清理资源
    if (driver) {
      await driver.deleteSession();
      console.log('🔌 Session closed');
    }
  }
}

// 执行测试
if (require.main === module) {
  runAppiumTest()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runAppiumTest };

