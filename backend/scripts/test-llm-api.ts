/**
 * LLM API 连接测试脚本
 * 用于验证 Qwen3-VL API 配置是否正确
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_KEY = process.env.LLM_API_KEY;
const API_ENDPOINT = process.env.LLM_API_ENDPOINT;
const MODEL_NAME = process.env.LLM_MODEL_NAME;

async function testLlmConnection() {
  console.log('🔧 LLM API 配置检查');
  console.log('━'.repeat(60));
  console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : '未配置'}`);
  console.log(`API Endpoint: ${API_ENDPOINT || '未配置'}`);
  console.log(`Model Name: ${MODEL_NAME || '未配置'}`);
  console.log('━'.repeat(60));

  if (!API_KEY || !API_ENDPOINT || !MODEL_NAME) {
    console.error('❌ 缺少必要的环境变量配置');
    process.exit(1);
  }

  console.log('\n🚀 开始测试 LLM API 连接...\n');

  try {
    const requestBody = {
      model: MODEL_NAME,
      messages: [
        {
          role: 'system',
          content: '你是一个手机 UI 自动化测试助手。',
        },
        {
          role: 'user',
          content: '请用 JSON 格式回复：{"actionPlan": {"actionType": "CLICK", "params": {"target": "确认按钮"}, "description": "点击确认按钮", "confidence": 0.9}, "reasoning": "这是一个测试"}',
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    };

    console.log('📤 发送请求...');
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const elapsed = Date.now() - startTime;

    console.log(`✅ HTTP 状态: ${response.status} ${response.statusText}`);
    console.log(`⏱️  耗时: ${elapsed}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ API 调用失败:');
      console.error(errorText);
      process.exit(1);
    }

    const result = await response.json();

    console.log('\n📥 响应数据:');
    console.log(JSON.stringify(result, null, 2));

    if (result.choices && result.choices[0]?.message?.content) {
      console.log('\n✅ LLM 响应内容:');
      const content = JSON.parse(result.choices[0].message.content);
      console.log(JSON.stringify(content, null, 2));
    }

    if (result.usage) {
      console.log('\n📊 Token 使用情况:');
      console.log(`  - Prompt Tokens: ${result.usage.prompt_tokens}`);
      console.log(`  - Completion Tokens: ${result.usage.completion_tokens}`);
      console.log(`  - Total Tokens: ${result.usage.total_tokens}`);
    }

    console.log('\n✅ LLM API 测试成功！');
    console.log('━'.repeat(60));
    console.log('✨ 配置正确，可以开始使用遍历功能了。');

  } catch (error: any) {
    console.error('\n❌ 测试失败:');
    
    if (error.name === 'AbortError') {
      console.error('  错误类型: 请求超时（30秒）');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('  错误类型: 连接被拒绝');
      console.error(`  请检查 API Endpoint 是否正确: ${API_ENDPOINT}`);
    } else if (error.code === 'ENOTFOUND') {
      console.error('  错误类型: 域名无法解析');
      console.error(`  请检查网络连接和 API Endpoint: ${API_ENDPOINT}`);
    } else {
      console.error(`  错误信息: ${error.message}`);
      if (error.stack) {
        console.error(`\n堆栈信息:\n${error.stack}`);
      }
    }

    console.log('\n💡 排查建议:');
    console.log('  1. 检查 API Key 是否有效');
    console.log('  2. 检查 API Endpoint 是否正确');
    console.log('  3. 检查网络连接是否正常');
    console.log('  4. 检查是否需要配置代理');
    
    process.exit(1);
  }
}

// 执行测试
testLlmConnection();

