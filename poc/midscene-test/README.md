# MidSceneJS PoC验证

## 目标

验证MidSceneJS视觉引擎集成流程，模拟多模态LLM分析Android截图的能力。

## 架构说明

在Android自动化场景中，MidSceneJS的替代方案是：
1. **Appium获取截图** → Android UI截图
2. **多模态LLM分析** → Qwen3-VL等模型识别UI元素
3. **视觉特征提取** → 元素位置、文本、类型等
4. **定位策略生成** → 结合DOM和视觉特征

## 前置条件

1. **安装依赖**
   ```bash
   cd poc/midscene-test
   pnpm install
   ```

2. **配置LLM API（可选）**
   ```bash
   export LLM_API_ENDPOINT="https://your-qwen-api.com"
   export LLM_API_KEY="your-api-key"
   export LLM_MODEL_NAME="qwen3-vl"
   ```

3. **准备测试截图（可选）**
   将Android应用截图放入 `test-images/` 目录

## 运行测试

```bash
pnpm test
```

## 验收标准

✅ 能够读取截图文件
✅ 能够调用多模态LLM API（或模拟调用）
✅ 能够解析视觉分析结果
✅ 能够生成定位策略候选

## 模拟模式

如果没有真实LLM API或测试截图，脚本会使用模拟数据展示集成流程。

## 实际部署需要

### 1. LLM API集成

```typescript
// 真实API调用示例
async function callQwenVisionAPI(imageBase64: string, prompt: string) {
  const response = await fetch('https://api.qwen.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen3-vl',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
          ],
        },
      ],
    }),
  });
  
  return await response.json();
}
```

### 2. 结果解析

需要将LLM返回的自然语言或结构化数据解析为：
- 元素类型（button, textfield, text等）
- 元素位置（bounds）
- 文本内容
- 置信度

### 3. 与Appium集成

```typescript
// 获取截图
const screenshot = await driver.takeScreenshot();

// 分析截图
const visionResult = await analyzeScreen(screenshot);

// 对比DOM和视觉结果
const fusedLocators = fuseDOMAndVision(domElements, visionResult.elements);
```

## 性能优化

1. **缓存机制**: 相同界面签名复用历史分析结果
2. **批量处理**: 多个元素一次性分析
3. **降级策略**: LLM不可用时仅使用DOM定位
4. **Token控制**: 限制单次请求的截图尺寸和Prompt长度

## 下一步

通过此PoC后，可以开发：
- 视觉解析服务（VisionService）
- 定位融合引擎（LocatorFusionEngine）
- 置信度计算算法
- 缓存和优化策略

