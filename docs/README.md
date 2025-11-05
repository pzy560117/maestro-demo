# Maestro 项目文档中心

> LLM驱动的手机端UI自动化定位系统 - 完整文档导航

---

## 📚 快速导航

### 🚀 快速开始
- **[项目总览](../README.md)** - 项目简介和主要功能
- **[快速开始指南](./guides/QUICKSTART.md)** - 5分钟上手指南
- **[本地开发指南](./guides/LOCAL-DEV-GUIDE.md)** - 完整开发环境配置
- **[Phase 5快速验证](./guides/PHASE-5-QUICKSTART.md)** - 最新功能验证

### 📋 需求与设计
- **[产品需求文档 (PRD)](./requirements/PRD.md)** - 完整需求说明
- **[数据库设计](./requirements/DATABASE.md)** - 数据库结构设计
- **[系统架构](./requirements/ARCHITECTURE.md)** - 技术架构说明
- **[迭代开发指南](./requirements/ITERATION-GUIDE.md)** - 开发流程规范

### 🎯 迭代交付报告
- **[Iteration 0](./iterations/iteration-0-delivery-report.md)** - 项目初始化
- **[Iteration 1](./iterations/iteration-1-delivery-report.md)** - 核心调度与LLM集成
- **[Iteration 2](./iterations/iteration-2-delivery-report.md)** - 界面采集与分析
- **[Iteration 3](./iterations/iteration-3-delivery-report.md)** - LLM审计与优化
- **[Iteration 4](./iterations/iteration-4-delivery-report.md)** - WebSocket实时更新
- **[Phase 5](./iterations/phase-5-delivery-report.md)** - API文档与集成测试 ⭐️

### 🔧 技术文档
- **[WebSocket实时更新](./technical/WEBSOCKET.md)** - WebSocket架构与实现
- **[LLM集成指南](./technical/LLM-INTEGRATION.md)** - 大模型接入说明
- **[集成测试指南](./technical/INTEGRATION-TESTING.md)** - 测试策略与实践
- **[API文档](http://localhost:3000/api/docs)** - Swagger在线文档

### 📦 模块文档
- **[后端 Backend](../backend/README.md)** - NestJS后端服务
- **[前端 Frontend](../frontend/README.md)** - React前端应用
- **[Docker部署](../docker/README.md)** - 容器化部署配置

---

## 🗂️ 文档结构

```
docs/
├── README.md                    # 本文档（文档索引）
├── requirements/                # 需求与设计文档
│   ├── PRD.md                  # 产品需求
│   ├── DATABASE.md             # 数据库设计
│   ├── ARCHITECTURE.md         # 系统架构
│   └── ITERATION-GUIDE.md      # 开发指南
├── iterations/                  # 迭代交付报告
│   ├── iteration-0-delivery-report.md
│   ├── iteration-1-delivery-report.md
│   ├── iteration-2-delivery-report.md
│   ├── iteration-3-delivery-report.md
│   ├── iteration-4-delivery-report.md
│   └── phase-5-delivery-report.md
├── guides/                      # 操作指南
│   ├── QUICKSTART.md           # 快速开始
│   ├── LOCAL-DEV-GUIDE.md      # 本地开发
│   └── PHASE-5-QUICKSTART.md   # Phase 5验证
├── technical/                   # 技术文档
│   ├── WEBSOCKET.md            # WebSocket实现
│   ├── LLM-INTEGRATION.md      # LLM集成
│   └── INTEGRATION-TESTING.md  # 集成测试
└── archive/                     # 历史归档
    └── (中间版本文档)
```

---

## 📊 项目状态

| 模块 | 状态 | 测试覆盖 | 文档完整度 |
|-----|------|---------|-----------|
| 后端API | ✅ 完成 | 100% (24/24) | ✅ 100% |
| 前端UI | ✅ 完成 | - | ✅ 100% |
| WebSocket | ✅ 完成 | ✅ 已测试 | ✅ 完整 |
| LLM集成 | ✅ 完成 | ✅ 已测试 | ✅ 完整 |
| 集成测试 | ✅ 完成 | 100% | ✅ 完整 |
| API文档 | ✅ 完成 | - | ✅ 100% |

---

## 🎯 当前版本

**Phase 5 已完成** (2025-11-05)

### ✅ Phase 5 交付内容
- API文档完整性：100%
- 集成测试通过率：100% (24/24)
- 前端性能优化：已完成
- Bug修复：10个关键问题已解决

### 📝 重要链接
- **Swagger API文档**: http://localhost:3000/api/docs
- **前端应用**: http://localhost:5173
- **健康检查**: http://localhost:3000/api/v1/health

---

## 🔍 常用文档

### 开发者
1. [本地开发指南](./guides/LOCAL-DEV-GUIDE.md) - 环境配置
2. [后端README](../backend/README.md) - API开发
3. [前端README](../frontend/README.md) - UI开发
4. [集成测试](./technical/INTEGRATION-TESTING.md) - 测试编写

### 产品/项目经理
1. [产品需求文档](./requirements/PRD.md) - 功能需求
2. [Phase 5交付报告](./iterations/phase-5-delivery-report.md) - 最新进展
3. [系统架构](./requirements/ARCHITECTURE.md) - 技术架构

### 测试/QA
1. [Phase 5快速验证](./guides/PHASE-5-QUICKSTART.md) - 测试指南
2. [集成测试报告](./iterations/phase-5-delivery-report.md#测试结果) - 测试详情
3. [API文档](http://localhost:3000/api/docs) - 接口测试

### 运维/DevOps
1. [Docker部署](../docker/README.md) - 容器化部署
2. [快速开始](./guides/QUICKSTART.md) - 服务启动
3. [健康检查](./technical/INTEGRATION-TESTING.md#健康检查) - 监控配置

---

## 📞 获取帮助

### 问题排查
1. 检查[快速开始指南](./guides/QUICKSTART.md#常见问题)
2. 查看[本地开发指南](./guides/LOCAL-DEV-GUIDE.md#troubleshooting)
3. 阅读具体模块的README文档

### 文档贡献
- 文档遵循 Markdown 格式
- 代码示例使用语法高亮
- 图片存放在 `docs/image/` 目录

---

## 📈 版本历史

| 版本 | 日期 | 主要更新 |
|-----|------|---------|
| Phase 5 | 2025-11-05 | API文档、集成测试、性能优化 |
| Iteration 4 | 2025-11-04 | WebSocket实时更新 |
| Iteration 3 | 2025-11-03 | LLM审计与优化 |
| Iteration 2 | 2025-11-02 | 界面采集与分析 |
| Iteration 1 | 2025-11-01 | 核心调度与LLM |
| Iteration 0 | 2025-10-31 | 项目初始化 |

---

**最后更新**: 2025-11-05  
**维护者**: Maestro团队  
**许可证**: MIT

