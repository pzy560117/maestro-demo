import { remote } from 'webdriverio';

async function test() {
  console.log('Testing Appium session creation...');
  console.log('Device: 66J5T18919000260');
  console.log('Package: com.macrovideo.v380pro');
  
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
    
    // 删除 session
    await driver.deleteSession();
    console.log('✅ Session deleted');
    console.log('\n🎉 Appium is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Appium session creation failed:');
    console.error((error as Error).message);
    process.exit(1);
  }
}

test();

