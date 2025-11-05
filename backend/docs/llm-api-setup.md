# LLM API 配置指南

本文档说明如何配置 Maestro 系统的 LLM API，支持 Qwen3-VL 或任何兼容 OpenAI API 格式的大模型服务。

---

## 1. 配置方式

LLM 服务通过环境变量配置，请在 `backend/.env` 文件中设置以下参数：

```bash
# LLM API 端点（必填）
LLM_API_ENDPOINT=http://localhost:8000/v1/chat/completions

# API 密钥（必填）
LLM_API_KEY=your-api-key-here

# 模型名称（必填）
LLM_MODEL_NAME=qwen3-vl

# 最大 token 数（可选，默认 6000）
LLM_MAX_TOKENS=6000

# 温度参数（可选，默认 0.7）
LLM_TEMPERATURE=0.7

# 超时时间毫秒（可选，默认 30000）
LLM_TIMEOUT_MS=30000

# 是否启用多模态（可选，默认 true）
LLM_MULTIMODAL=true
```

---

## 2. 支持的 LLM 服务

### 2.1 Qwen3-VL（推荐）

**部署方式 1：使用 vLLM**

```bash
# 拉取镜像
docker pull vllm/vllm-openai:latest

# 启动服务
docker run -d \
  --name qwen3-vl \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model Qwen/Qwen3-VL-7B-Instruct \
  --trust-remote-code \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.9

# 测试连接
curl http://localhost:8000/v1/models
```

**部署方式 2：使用 Ollama**

```bash
# 安装 Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 拉取模型
ollama pull qwen3-vl

# 启动服务（自动运行）
ollama serve

# 配置环境变量
LLM_API_ENDPOINT=http://localhost:11434/v1/chat/completions
LLM_API_KEY=ollama
LLM_MODEL_NAME=qwen3-vl
```

### 2.2 OpenAI GPT-4V

```bash
LLM_API_ENDPOINT=https://api.openai.com/v1/chat/completions
LLM_API_KEY=sk-your-openai-api-key
LLM_MODEL_NAME=gpt-4-vision-preview
LLM_MULTIMODAL=true
```

### 2.3 Azure OpenAI

```bash
LLM_API_ENDPOINT=https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2023-12-01-preview
LLM_API_KEY=your-azure-api-key
LLM_MODEL_NAME=gpt-4-vision
```

### 2.4 本地模型（LM Studio）

```bash
# 下载并启动 LM Studio
# 在 Local Server 中加载 Qwen 或其他支持视觉的模型
# 启动服务器（默认端口 1234）

LLM_API_ENDPOINT=http://localhost:1234/v1/chat/completions
LLM_API_KEY=lm-studio
LLM_MODEL_NAME=qwen3-vl
```

---

## 3. API 请求格式

Maestro 发送的请求符合 OpenAI Chat Completions API 规范：

```json
{
  "model": "qwen3-vl",
  "messages": [
    {
      "role": "system",
      "content": "你是一个专业的 Android UI 自动化测试助手..."
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "请分析当前界面截图..."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "file:///path/to/screenshot.png"
          }
        }
      ]
    }
  ],
  "temperature": 0.7,
  "max_tokens": 6000,
  "response_format": {
    "type": "json_object"
  }
}
```

### 预期响应格式

```json
{
  "choices": [
    {
      "message": {
        "content": "{\"actionPlan\": {...}, \"reasoning\": \"...\", \"screenAnalysis\": {...}}"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 1200,
    "completion_tokens": 150,
    "total_tokens": 1350
  }
}
```

---

## 4. 多模态支持

### 图片格式

支持以下图片路径格式：

- **本地文件**：`file:///path/to/screenshot.png`
- **HTTP URL**：`http://example.com/screenshot.png`
- **Base64**：`data:image/png;base64,iVBORw0KGgoAAAANS...`（部分服务支持）

### 禁用多模态

如果使用纯文本模型（如 GPT-3.5），设置：

```bash
LLM_MULTIMODAL=false
```

此时仅发送文本 Prompt，不包含截图。

---

## 5. 故障排查

### 问题 1：连接超时

**现象**：
```
LLM API timeout after 30000ms
```

**解决方案**：
1. 增加超时时间：`LLM_TIMEOUT_MS=60000`
2. 检查模型服务是否正常运行
3. 检查网络连接

### 问题 2：连接被拒绝

**现象**：
```
Cannot connect to LLM API at http://localhost:8000/v1/chat/completions
```

**解决方案**：
1. 确认 LLM 服务已启动
2. 检查端口是否正确
3. 测试连接：`curl http://localhost:8000/v1/models`

### 问题 3：响应格式错误

**现象**：
```
LLM 响应格式错误：无法解析 JSON
```

**解决方案**：
1. 检查模型是否支持 `response_format: json_object`
2. 查看 LLM 日志表 `llm_logs`，检查原始响应
3. 调整 Prompt 模板，明确要求返回 JSON

### 问题 4：API 密钥无效

**现象**：
```
LLM API error: 401 Unauthorized
```

**解决方案**：
1. 检查 `LLM_API_KEY` 是否正确
2. 确认 API Key 有效期
3. 对于本地模型，可以使用任意值（如 `local`）

---

## 6. 性能优化

### 6.1 Token 优化

- 减少 Prompt 长度，只保留关键信息
- 使用 DOM 摘要而非完整 DOM
- 限制历史操作记录数量（默认最近 5 条）

### 6.2 并发控制

- 单个任务运行时，LLM 调用是串行的
- 多个任务并发时，受限于 LLM 服务的并发能力
- 建议配置 LLM 服务的 QPS 限制

### 6.3 缓存策略

- Maestro 会记录所有 LLM 请求/响应到 `llm_logs` 表
- 相同界面的重复请求可以考虑实现缓存（未来优化）

---

## 7. 成本预估

### Qwen3-VL（本地部署）

- **硬件要求**：NVIDIA GPU（≥8GB 显存）
- **成本**：仅硬件和电力成本
- **推荐**：适合高频使用场景

### OpenAI GPT-4V（API）

- **价格**：约 $0.01/1K tokens（输入），$0.03/1K tokens（输出）
- **单次调用成本**：约 $0.02 - $0.05
- **月成本**：根据任务频率，预估 $50 - $500

---

## 8. 安全建议

1. **不要在代码中硬编码 API Key**
2. **使用环境变量或密钥管理服务**（如 AWS Secrets Manager、HashiCorp Vault）
3. **限制 LLM 服务的网络访问**（仅允许 Maestro 服务器 IP）
4. **定期轮换 API Key**
5. **监控 API 用量**，防止滥用

---

## 9. 测试连接

启动 Maestro 后，可以通过以下方式测试 LLM 连接：

```bash
# 调用生成动作接口
curl -X POST http://localhost:3000/api/v1/llm/generate-action \
  -H "Content-Type: application/json" \
  -d '{
    "taskRunId": "test-task-run-id",
    "screenshotPath": "/tmp/screenshot.png",
    "allowedActions": ["CLICK", "INPUT", "SCROLL"],
    "userPrompt": "分析当前界面并生成下一步动作"
  }'
```

如果配置正确，将返回动作计划：

```json
{
  "actionPlan": {
    "actionType": "CLICK",
    "params": { "target": "..." },
    "description": "...",
    "confidence": 0.85
  },
  "reasoning": "...",
  "screenAnalysis": {...}
}
```

---

## 10. 参考链接

- [Qwen3-VL 官方文档](https://github.com/QwenLM/Qwen-VL)
- [vLLM 部署指南](https://docs.vllm.ai/)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [Ollama 文档](https://ollama.com/library/qwen3-vl)

---

**更新时间**：2025-11-04  
**维护人员**：开发团队

