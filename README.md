# Maestro

> LLM驱动的手机端UI自动化定位系统

[![Phase](https://img.shields.io/badge/Phase-5%20完成-success)](docs/iterations/phase-5-delivery-report.md)
[![Tests](https://img.shields.io/badge/Tests-24%2F24%20通过-brightgreen)](backend/test/integration.e2e-spec.ts)
[![API Docs](https://img.shields.io/badge/API%20Docs-100%25-blue)](http://localhost:3000/api/docs)

---

## 🎯 项目简介

Maestro是一个创新的移动端UI自动化测试系统，通过大语言模型(LLM)智能分析界面，自动生成精准的UI元素定位策略，解决传统自动化测试中定位脆弱、维护成本高的痛点。

## 📌 当前会话任务追踪
- [x] 分析ADB离线循环重连问题并给出可执行排查步骤（2025-11-06）
- [x] 设备连接已恢复正常，问题已解决（2025-11-06）
- [x] 切换Appium至本地运行并完成端到端测试验证（2025-11-06）
  - ✅ 本机安装并启动 Appium 3.1.0 + UiAutomator2 2.45.1
  - ✅ 修复设备分配逻辑，优先使用任务指定设备
  - ✅ 任务在真实设备（66J5T18919000260）上成功执行
  - ✅ 状态：SUCCEEDED，覆盖1个界面，执行时长约10秒
- [x] 排查遍历任务执行后无日志且设备无动作的根因并提出解决方案（2025-11-06）
- [x] 重新部署并手动启动调度器，验证新建遍历任务进入RUNNING并生成task_runs/task_run_events（2025-11-06）
- [x] 修复 GET /api/v1/orchestrator/task-runs/:id BigInt 序列化异常并补充单元测试（2025-11-06）
- [x] 优化任务调度健壮性：状态机超时保护（60s）、Appium重试机制（3次）、卡住任务自动修复（2025-11-06）
- [x] 在后端环境文件中配置 DashScope Qwen3 API Key，恢复 LLM 鉴权（2025-11-07）
- [x] 修复 DashScope 401 鉴权错误：清理密钥空白、补充 DashScope Header 并通过脚本验证（2025-11-07）
- [x] 优化 Prompt DOM 摘要：限制深度与关键信息提取，显著降低 Token 消耗（2025-11-07）
- [x] 集成 MidScene DashScope 视觉摘要并注入 LLM Prompt（2025-11-07）
- [x] 视觉-DOM 匹配与 MidScene 并发时延监控策略落地（2025-11-07）
- [x] 打通 MinIO 截图预签名 URL 并调整 LLM 调用链路（2025-11-07）

### 核心特性

- **🤖 LLM智能定位**: 利用Qwen3-VL多模态大模型，智能理解界面语义
- **📱 自动化遍历**: 系统化遍历应用界面，自动采集界面数据
- **🎯 精准定位**: 生成稳定可靠的元素定位策略（resourceId、text、xpath等）
- **📊 实时监控**: WebSocket实时推送任务状态和告警信息
- **🔍 差异分析**: 智能对比不同版本界面变化
- **📚 界面库管理**: 自动积累和复用界面定位知识

---

## 🚀 快速开始

### 5分钟上手

```bash
# 1. 启动Docker服务
docker-compose -f docker/docker-compose.yml up -d

# 2. 初始化后端
cd backend
npm install
npx prisma generate && npx prisma db push
npm run start:dev

# 3. 启动前端
cd frontend
npm install
npm run dev
```

**访问应用**:
- 🌐 前端: http://localhost:5173
- 📚 API文档: http://localhost:8360/api/docs
- 💚 健康检查: http://localhost:8360/api/v1/health

👉 **详细指南**: [快速开始文档](docs/guides/QUICKSTART.md)

---

## 📚 文档导航

### 🎓 新手指南
- **[快速开始](docs/guides/QUICKSTART.md)** - 5分钟上手
- **[本地开发](docs/guides/LOCAL-DEV-GUIDE.md)** - 完整开发环境配置
- **[后端问题排查](docs/guides/BACKEND-TROUBLESHOOTING.md)** ⭐ - 常见问题快速解决
- **[项目文档中心](docs/README.md)** - 所有文档索引

### 📋 需求与设计
- **[产品需求文档](docs/requirements/PRD.md)** - 功能需求说明
- **[数据库设计](docs/requirements/DATABASE.md)** - 数据模型设计
- **[系统架构](docs/requirements/ARCHITECTURE.md)** - 技术架构说明

### 🎯 迭代交付
- **[Phase 5 - API文档与测试](docs/iterations/phase-5-delivery-report.md)** ⭐️ 最新
- **[Iteration 4 - WebSocket实时更新](docs/iterations/iteration-4-delivery-report.md)**
- **[查看全部迭代](docs/README.md#迭代交付报告)**

### 🔧 技术文档
- **[WebSocket实现](docs/technical/WEBSOCKET.md)** - 实时通信架构
- **[LLM集成指南](docs/technical/LLM-INTEGRATION.md)** - 大模型接入
- **[集成测试指南](docs/technical/INTEGRATION-TESTING.md)** - 测试策略

---

## 📦 项目结构

```
maestro/
├── backend/              # NestJS后端服务
│   ├── src/             # 源代码
│   │   ├── modules/     # 业务模块
│   │   │   ├── tasks/      # 任务管理
│   │   │   ├── screens/    # 界面管理
│   │   │   ├── devices/    # 设备管理
│   │   │   ├── alerts/     # 告警管理
│   │   │   ├── llm/        # LLM服务
│   │   │   └── ...
│   │   └── main.ts      # 入口文件
│   ├── test/            # 测试文件
│   └── prisma/          # 数据库Schema
│
├── frontend/            # React前端应用
│   ├── src/
│   │   ├── modules/     # 页面模块
│   │   ├── components/  # 通用组件
│   │   ├── lib/         # 工具库
│   │   └── types/       # 类型定义
│   └── dist/            # 构建产物
│
├── docker/              # Docker配置
│   ├── docker-compose.yml
│   └── init-db.sql
│
├── docs/                # 项目文档
│   ├── requirements/    # 需求文档
│   ├── iterations/      # 迭代报告
│   ├── guides/          # 操作指南
│   └── technical/       # 技术文档
│
└── poc/                 # 概念验证代码
```

---

## 🛠️ 技术栈

### 后端
- **框架**: NestJS 10 + TypeScript
- **数据库**: PostgreSQL 14 + Prisma ORM
- **缓存**: Redis 7
- **实时通信**: Socket.IO (WebSocket)
- **文档**: Swagger/OpenAPI 3.1
- **测试**: Jest + Supertest

### 前端
- **框架**: React 18 + TypeScript
- **路由**: React Router 6
- **状态管理**: React Query + Zustand
- **UI**: Radix UI + TailwindCSS
- **表单**: React Hook Form + Zod
- **图表**: Recharts

### 集成服务
- **LLM**: 阿里云通义千问 Qwen3-VL
- **自动化**: Appium + MidSceneJS
- **存储**: MinIO (对象存储)

---

## 📊 项目状态

### Phase 5 已完成 ✅

| 模块 | 状态 | 测试覆盖 | 文档完整度 |
|-----|------|---------|-----------|
| 后端API | ✅ 完成 | 100% (24/24) | ✅ 100% |
| 前端UI | ✅ 完成 | - | ✅ 100% |
| WebSocket | ✅ 完成 | ✅ 已测试 | ✅ 完整 |
| LLM集成 | ✅ 完成 | ✅ 已测试 | ✅ 完整 |
| 集成测试 | ✅ 完成 | 100% | ✅ 完整 |
| API文档 | ✅ 完成 | - | ✅ 100% |

### 核心指标
- ✅ **24/24** 集成测试通过
- ✅ **47个** API端点，全部文档化
- ✅ **100%** Swagger文档覆盖
- ✅ **<200ms** API平均响应时间
- ✅ **<2s** 前端首屏加载

---

## 🎯 核心功能

### 1. 智能遍历任务 📱
- 创建遍历任务，配置覆盖策略（FULL/SMOKE/CUSTOM）
- 自动选择设备，实时监控任务状态
- 支持任务优先级、黑名单路径、遍历深度配置

### 2. 界面自动采集 📸
- 自动捕获界面截图和DOM结构
- 提取界面元素信息（类型、位置、文本等）
- 生成唯一界面签名，支持相似度去重

### 3. LLM智能定位 🤖
- 多模态分析：截图 + DOM结构
- 生成多种定位策略：resourceId、text、xpath
- 智能降级机制，确保定位稳定性

### 4. 界面差异分析 🔍
- 对比不同版本界面变化
- 识别新增/删除/修改的元素
- 评估变更影响，生成差异报告

### 5. 实时告警通知 🚨
- 定位失败、界面变更实时告警
- 支持邮件、企业微信、钉钉通知
- 告警确认和处理流程

### 6. 界面库管理 📚
- 积累界面定位知识
- 支持搜索、筛选、版本对比
- 导出定位策略，供自动化脚本使用

---

## 🧪 测试与质量

### 集成测试
```bash
cd backend
npm run test:integration
# ✅ Tests: 24 passed, 24 total
```

### 测试覆盖
- **设备管理**: 4个测试
- **应用版本**: 4个测试
- **任务管理**: 5个测试
- **界面管理**: 4个测试
- **告警管理**: 6个测试
- **健康检查**: 1个测试

👉 **详细测试指南**: [集成测试文档](docs/technical/INTEGRATION-TESTING.md)

---

## 🔗 相关链接

- **📚 API文档**: http://localhost:8360/api/docs (Swagger)
- **🌐 前端应用**: http://localhost:5173
- **💚 健康检查**: http://localhost:8360/api/v1/health
- **📖 文档中心**: [docs/README.md](docs/README.md)
- **🐛 问题反馈**: GitHub Issues

---

## 🤝 贡献指南

### 开发流程
1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

### 代码规范
- 遵循[阿里巴巴Java开发手册](https://github.com/alibaba/p3c)
- 使用ESLint + Prettier
- 编写单元测试和集成测试
- 更新相关文档

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 👥 团队

**Maestro开发团队**

---

## 📞 联系我们

- **技术支持**: 查看[文档中心](docs/README.md)
- **Bug反馈**: 提交GitHub Issue
- **功能建议**: 发起Discussion

---

## 🎉 致谢

感谢以下开源项目：
- [NestJS](https://nestjs.com/) - 强大的Node.js框架
- [React](https://react.dev/) - 灵活的UI框架
- [Prisma](https://www.prisma.io/) - 现代化ORM
- [TailwindCSS](https://tailwindcss.com/) - 实用的CSS框架
- [Appium](https://appium.io/) - 移动端自动化测试
- [阿里云通义千问](https://dashscope.aliyun.com/) - 多模态大模型

---

<div align="center">

**⭐️ 如果这个项目对您有帮助，请给我们一个星标！**

Made with ❤️ by Maestro Team

</div>
