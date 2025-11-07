import { remote } from 'webdriverio';

async function test() {
  console.log('Testing Appium session creation...');
  
  try {
    const driver = await remote({
      protocol: 'http',
      hostname: 'localhost',
      port: 4723,
      path: '/',
      capabilities: {
        platformName: 'Android',
        'appium:deviceName': '66J5T18919000260',
        'appium:udid': '66J5T18919000260',
        'appium:appPackage': 'com.macrovideo.v380pro',
        'appium:appActivity': 'com.macrovideo.v380pro.MainActivity',
        'appium:automationName': 'UiAutomator2',
        'appium:noReset': true,
        'appium:fullReset': false,
      },
    });
    
    console.log(`✅ Session created: ${driver.sessionId}`);
    
    // 获取当前界面
    const source = await driver.getPageSource();
    console.log(`✅ Got page source (${source.length} chars)`);
    
    // 截图
    const screenshot = await driver.takeScreenshot();
    console.log(`✅ Took screenshot (${screenshot.length} chars)`);
    
    // 删除 session
    await driver.deleteSession();
    console.log('✅ Session deleted');
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

test();


