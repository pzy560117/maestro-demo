# Maestro Frontend

LLM驱动的手机端UI自动化定位系统 - 前端应用

## 技术栈

- **框架**: React 18 + TypeScript 5
- **构建工具**: Vite 5
- **样式**: TailwindCSS 3.4 + shadcn/ui
- **路由**: React Router 6
- **状态管理**: 
  - React Query (服务端状态)
  - Zustand (全局UI状态)
- **表单**: React Hook Form + Zod
- **图表**: Recharts
- **图标**: Lucide React

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件配置 API 地址
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

## 项目结构

```
frontend/
├── src/
│   ├── components/         # 公共组件
│   │   ├── ui/            # shadcn/ui 组件
│   │   └── layouts/       # 布局组件
│   ├── modules/           # Feature 模块
│   │   ├── dashboard/     # 仪表盘
│   │   ├── tasks/         # 任务管理
│   │   ├── screens/       # 界面版本库
│   │   ├── alerts/        # 告警中心
│   │   ├── devices/       # 设备管理
│   │   └── apps/          # 应用管理
│   ├── lib/               # 工具库
│   │   ├── api/          # API 客户端
│   │   └── utils.ts      # 工具函数
│   ├── types/            # TypeScript 类型定义
│   ├── App.tsx           # 应用主组件
│   ├── main.tsx          # 入口文件
│   └── index.css         # 全局样式
├── public/               # 静态资源
├── index.html           # HTML 模板
├── package.json
├── vite.config.ts       # Vite 配置
├── tailwind.config.js   # Tailwind 配置
└── tsconfig.json        # TypeScript 配置
```

## 可用命令

### 开发
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
```

### 代码质量
```bash
npm run lint         # ESLint 检查
npm run format       # Prettier 格式化
npm run type-check   # TypeScript 类型检查
```

## 核心功能模块

### 1. Dashboard (仪表盘)
- KPI 指标展示
- 任务活动时间线
- 告警概览

### 2. Tasks (任务管理)
- 任务列表
- 任务详情
- 创建任务
- 任务执行回放

### 3. Screens (界面版本库)
- 界面网格展示
- 界面详情
- 定位列表
- 差异对比

### 4. Alerts (告警中心)
- 告警列表
- 告警详情
- 告警处理

### 5. Devices (设备管理)
- 设备列表
- 设备状态监控

### 6. Apps (应用管理)
- 应用列表
- 版本管理

## 设计规范

### 色彩方案
- 主色: `#4C6FFF` (Electric Indigo)
- 辅助色: `#1B1F2B` (暗色背景)
- 强调色: `#5FE1B7` (Neon Mint)

### 设计风格
- Bento 布局
- Glassmorphism (玻璃拟态)
- 暗黑模式优先

### 组件库
基于 shadcn/ui，所有组件支持完整的可访问性和主题定制。

## API 对接

API 客户端位于 `src/lib/api/`，包含：
- `client.ts` - Axios 封装
- `devices.ts` - 设备 API
- `apps.ts` - 应用 API
- `tasks.ts` - 任务 API
- `screens.ts` - 界面 API
- `alerts.ts` - 告警 API

所有 API 请求自动处理：
- 统一响应格式
- 错误处理
- 认证 Token（待实现）

## 类型定义

TypeScript 类型定义位于 `src/types/`：
- `api.ts` - 通用 API 类型
- `device.ts` - 设备类型
- `app.ts` - 应用类型
- `task.ts` - 任务类型
- `screen.ts` - 界面类型
- `alert.ts` - 告警类型

## 开发指南

### 添加新页面
1. 在 `src/modules/{module}` 创建页面组件
2. 在 `src/App.tsx` 添加路由配置
3. 在 `src/components/layouts/Sidebar.tsx` 添加导航项

### 添加新 API
1. 在 `src/types` 定义类型
2. 在 `src/lib/api` 创建 API 服务
3. 使用 React Query 进行数据获取

### 样式规范
- 使用 Tailwind utility classes
- 自定义样式使用 CSS-in-JS 或 `@apply`
- 遵循 Glassmorphism 设计风格

## Iteration 4 开发计划

### Phase 1: 基础架构 ✅
- [x] 项目初始化
- [x] 配置文件
- [x] 布局组件
- [x] API 客户端
- [x] 类型定义

### Phase 2: 核心页面 (进行中)
- [ ] Dashboard 完整实现
- [ ] TaskList 数据对接
- [ ] TaskDetail 详情页
- [ ] TaskCreate 创建表单

### Phase 3: 辅助功能
- [ ] ScreenLibrary
- [ ] AlertCenter
- [ ] DeviceList
- [ ] AppList

### Phase 4: WebSocket
- [ ] 实时任务状态更新
- [ ] 实时告警推送

### Phase 5: 测试与优化
- [ ] E2E 测试
- [ ] 性能优化
- [ ] 可访问性测试

## 许可证

MIT

