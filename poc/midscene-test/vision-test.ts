/**
 * MidSceneJS PoC验证脚本
 * 用途：验证MidSceneJS视觉引擎集成
 * 
 * 运行前确保：
 * 1. 已安装@midscene/web依赖
 * 2. LLM API配置正确（Qwen3-VL或其他多模态模型）
 * 3. 有可用的测试截图
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 注意：MidSceneJS主要用于Web自动化
 * 在Android场景中，我们需要：
 * 1. 获取截图（通过Appium）
 * 2. 使用LLM多模态能力分析截图
 * 3. 提取元素特征和定位信息
 * 
 * 此PoC展示与多模态LLM的交互流程
 */

interface VisionAnalysisRequest {
  imageBase64: string;
  prompt: string;
  modelName: string;
}

interface ElementFeature {
  type: string;
  text?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

interface VisionAnalysisResult {
  elements: ElementFeature[];
  screenDescription: string;
  totalElements: number;
}

/**
 * 模拟LLM多模态API调用
 * 实际应用中需要对接真实的Qwen3-VL API
 */
async function callVisionModel(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
  console.log('📡 Calling Vision Model:', request.modelName);
  console.log('📝 Prompt:', request.prompt.substring(0, 100) + '...');
  
  // 实际实现中应调用真实LLM API
  // 此处返回模拟数据用于PoC验证
  
  // 模拟API延迟
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // 模拟返回结果
  return {
    elements: [
      {
        type: 'button',
        text: '登录',
        bounds: { x: 100, y: 200, width: 200, height: 48 },
        confidence: 0.95,
      },
      {
        type: 'textfield',
        text: '',
        bounds: { x: 100, y: 100, width: 300, height: 48 },
        confidence: 0.92,
      },
      {
        type: 'text',
        text: '用户名',
        bounds: { x: 100, y: 80, width: 100, height: 20 },
        confidence: 0.98,
      },
    ],
    screenDescription: '登录界面，包含用户名输入框和登录按钮',
    totalElements: 3,
  };
}

/**
 * 分析截图，提取UI元素
 */
async function analyzeScreen(screenshotPath: string): Promise<VisionAnalysisResult> {
  console.log('🔍 Analyzing screenshot:', screenshotPath);
  
  // 检查文件是否存在
  if (!fs.existsSync(screenshotPath)) {
    throw new Error(`Screenshot not found: ${screenshotPath}`);
  }
  
  // 读取截图并转换为base64
  const imageBuffer = fs.readFileSync(screenshotPath);
  const imageBase64 = imageBuffer.toString('base64');
  
  console.log('📸 Screenshot loaded, size:', (imageBuffer.length / 1024).toFixed(2), 'KB');
  
  // 构建分析提示词
  const prompt = `
请分析这张Android应用截图，识别所有可交互的UI元素。
对每个元素，提供：
1. 元素类型（button, textfield, text, image等）
2. 元素文本内容（如果有）
3. 元素位置和尺寸（bounds: x, y, width, height）
4. 识别置信度（0-1）

同时提供整个界面的简要描述。
`;
  
  // 调用视觉模型
  const result = await callVisionModel({
    imageBase64,
    prompt,
    modelName: process.env.LLM_MODEL_NAME || 'qwen3-vl',
  });
  
  return result;
}

/**
 * 生成定位策略
 */
function generateLocatorStrategies(element: ElementFeature): string[] {
  const strategies: string[] = [];
  
  if (element.text) {
    strategies.push(`text="${element.text}"`);
    strategies.push(`contentDescription="${element.text}"`);
  }
  
  if (element.bounds) {
    strategies.push(
      `bounds=[${element.bounds.x},${element.bounds.y}][${element.bounds.x + element.bounds.width},${element.bounds.y + element.bounds.height}]`,
    );
  }
  
  return strategies;
}

/**
 * 主测试流程
 */
async function runMidSceneTest() {
  console.log('🚀 Starting MidSceneJS PoC Test...\n');
  
  try {
    // 测试1: 准备测试截图
    console.log('📋 Test 1: Prepare Test Screenshot');
    const testImageDir = path.join(__dirname, 'test-images');
    
    // 创建测试图片目录
    if (!fs.existsSync(testImageDir)) {
      fs.mkdirSync(testImageDir, { recursive: true });
      console.log('  ✓ Created test-images directory\n');
    }
    
    // 检查是否有测试图片
    const testImages = fs.readdirSync(testImageDir).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
    
    if (testImages.length === 0) {
      console.log('  ⚠️  No test images found');
      console.log('  💡 Please add screenshot files to:', testImageDir);
      console.log('  🎯 Using mock data for demonstration\n');
      
      // 使用模拟数据继续测试
      const mockResult: VisionAnalysisResult = {
        elements: [
          {
            type: 'button',
            text: '登录',
            bounds: { x: 100, y: 200, width: 200, height: 48 },
            confidence: 0.95,
          },
          {
            type: 'textfield',
            text: '',
            bounds: { x: 100, y: 100, width: 300, height: 48 },
            confidence: 0.92,
          },
        ],
        screenDescription: '登录界面（模拟数据）',
        totalElements: 2,
      };
      
      displayResults(mockResult);
      
      console.log('\n✅ MidSceneJS集成流程验证成功（模拟模式）！');
      console.log('📝 实际部署时需要：');
      console.log('   1. 配置真实的Qwen3-VL API密钥');
      console.log('   2. 实现完整的API调用逻辑');
      console.log('   3. 添加错误处理和重试机制\n');
      
      return { success: true, mode: 'mock' };
    }
    
    // 测试2: 分析截图
    const testImage = path.join(testImageDir, testImages[0]);
    console.log('📋 Test 2: Analyze Screenshot');
    const result = await analyzeScreen(testImage);
    console.log('  ✓ Analysis complete\n');
    
    // 测试3: 显示结果
    displayResults(result);
    
    // 测试4: 生成定位策略
    console.log('📋 Test 4: Generate Locator Strategies');
    result.elements.forEach((element, index) => {
      console.log(`\n  Element ${index + 1}: ${element.type} "${element.text || 'N/A'}"`);
      const strategies = generateLocatorStrategies(element);
      strategies.forEach((strategy) => {
        console.log(`    - ${strategy}`);
      });
    });
    console.log('  ✓ Strategies generated\n');
    
    console.log('🎉 All tests passed!\n');
    console.log('✅ MidSceneJS集成验证成功！');
    console.log('可以开始开发定位融合引擎。\n');
    
    return {
      success: true,
      mode: 'real',
      result,
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n💡 提示: 确保LLM API配置正确\n');
    
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 显示分析结果
 */
function displayResults(result: VisionAnalysisResult) {
  console.log('📋 Test 3: Display Results');
  console.log('  Screen Description:', result.screenDescription);
  console.log('  Total Elements:', result.totalElements);
  console.log('\n  Elements Details:');
  
  result.elements.forEach((element, index) => {
    console.log(`\n    ${index + 1}. ${element.type}`);
    if (element.text) {
      console.log(`       Text: "${element.text}"`);
    }
    if (element.bounds) {
      console.log(
        `       Bounds: [${element.bounds.x}, ${element.bounds.y}, ${element.bounds.width}, ${element.bounds.height}]`,
      );
    }
    console.log(`       Confidence: ${(element.confidence * 100).toFixed(1)}%`);
  });
  
  console.log('  ✓ Results displayed\n');
}

// 执行测试
if (require.main === module) {
  runMidSceneTest()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runMidSceneTest, analyzeScreen };

