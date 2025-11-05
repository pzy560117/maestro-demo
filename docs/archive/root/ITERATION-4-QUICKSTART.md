# Iteration 4 快速启动指南

**更新时间**: 2025-11-05  
**状态**: ✅ Phase 1 完成 - 前端基础架构就绪

---

## 🎯 Iteration 4 目标

建立完整的前端后台系统，提供可视化界面管理遍历任务、界面版本库和告警。

---

## ✅ 已完成（Phase 1）

### 前端基础架构
- ✅ React 18 + TypeScript 5 + Vite 5 项目
- ✅ TailwindCSS + shadcn/ui 组件库
- ✅ 完整的类型系统和 API 客户端
- ✅ Glassmorphism 暗黑主题布局
- ✅ 9 个核心页面路由和框架

---

## 🚀 快速启动

### 1. 启动后端服务

```bash
# 启动数据库等基础服务
cd docker
docker-compose up -d

# 启动后端
cd ../backend
npm install
npm run start:dev
```

后端地址: http://localhost:3000  
API 文档: http://localhost:3000/api/docs

### 2. 启动前端服务

```bash
cd frontend
npm install
npm run dev
```

前端地址: http://localhost:5173

或使用脚本（Windows）:
```bash
cd frontend\scripts
dev.bat
```

### 3. 访问应用

打开浏览器访问: **http://localhost:5173**

默认路由:
- `/dashboard` - 仪表盘
- `/tasks` - 任务管理
- `/screens` - 界面版本库
- `/alerts` - 告警中心
- `/devices` - 设备管理
- `/apps` - 应用管理

---

## 📁 项目结构

```
maestro/
├── backend/              # NestJS 后端（已完成 Iteration 1-3）
├── frontend/            # React 前端（Iteration 4）
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── modules/     # 页面模块
│   │   ├── lib/        # API 和工具
│   │   └── types/      # TypeScript 类型
│   ├── package.json
│   └── vite.config.ts
├── docker/              # Docker 配置
└── docs/               # 文档
```

---

## 🎨 界面预览

### 布局系统

- **顶部导航栏**: Logo、通知、用户菜单
- **侧边导航栏**: 模块导航（6 个主要菜单）
- **内容区域**: 响应式布局，支持滚动

### 设计风格

- **Glassmorphism**: 玻璃拟态效果
- **Bento Layout**: 卡片式布局
- **暗黑模式**: 主色 `#4C6FFF`，强调色 `#5FE1B7`

### 已实现页面

#### 1. Dashboard（仪表盘）- 框架完成
- KPI 卡片（任务状态、覆盖率、成功率、告警）
- 最近任务活动
- 告警时间线

#### 2. TaskList（任务列表）- 框架完成
- 任务表格展示
- 状态徽章
- 创建任务按钮

#### 3. 其他页面 - 占位符
- 任务详情、界面库、告警等待 Phase 2-3 开发

---

## 🛠️ 开发工作流

### 前端开发

```bash
cd frontend

# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# 格式化代码
npm run format

# 类型检查
npm run type-check
```

### 添加新页面

1. 在 `src/modules/{module}` 创建页面组件
2. 在 `src/App.tsx` 添加路由
3. 在 `src/components/layouts/Sidebar.tsx` 添加菜单项

### 调用 API

```typescript
import { TasksApi } from '@/lib/api';

// 获取任务列表
const tasks = await TasksApi.getTasks({ page: 1, limit: 20 });

// 创建任务
const newTask = await TasksApi.createTask({
  name: '测试任务',
  appVersionId: 'xxx',
  deviceIds: ['xxx'],
  coverageStrategy: 'CORE',
});
```

---

## 📊 技术栈

### 前端
- **框架**: React 18.3
- **语言**: TypeScript 5.3
- **构建**: Vite 5.0
- **样式**: TailwindCSS 3.4
- **组件**: shadcn/ui
- **路由**: React Router 6
- **状态**: React Query + Zustand
- **表单**: React Hook Form + Zod
- **图标**: Lucide React

### 后端
- **框架**: NestJS 10
- **数据库**: PostgreSQL 16
- **ORM**: Prisma
- **缓存**: Redis 7
- **存储**: MinIO

---

## 🎯 Phase 2-5 开发计划

### Phase 2: 核心页面开发（优先）
- [ ] Dashboard 数据对接
- [ ] TaskList 完善（筛选、排序、分页）
- [ ] TaskDetail 实现
- [ ] TaskCreate 表单实现
- [ ] ScreenLibrary 基础功能

### Phase 3: 辅助功能页面
- [ ] ScreenDetail（定位列表）
- [ ] AlertCenter（告警管理）
- [ ] DeviceList（设备管理）
- [ ] AppList（应用版本管理）

### Phase 4: WebSocket 实时更新
- [ ] 后端 Socket.io Gateway
- [ ] 前端 Socket 集成
- [ ] 任务状态实时推送
- [ ] 告警实时通知

### Phase 5: 测试与优化
- [ ] E2E 测试
- [ ] API 文档完善
- [ ] 性能优化
- [ ] 可访问性测试

---

## 📝 关键特性

### 类型安全
- 100% TypeScript 覆盖
- 自动类型推断
- 编译时类型检查

### API 集成
- 统一的 API 客户端
- 自动错误处理
- 请求/响应拦截

### 响应式设计
- 移动端适配
- 触摸友好
- 流畅动画

### 可访问性
- WCAG 2.1 AA 标准
- 键盘导航
- 屏幕阅读器支持

---

## 🐛 故障排查

### 前端无法启动

检查：
1. Node.js 版本 >= 20
2. 依赖是否安装: `npm install`
3. 端口 5173 是否被占用

### API 请求失败

检查：
1. 后端服务是否启动: http://localhost:3000/api/v1/health
2. `.env` 文件配置是否正确
3. CORS 是否配置（Vite 已配置代理）

### 样式显示异常

检查：
1. TailwindCSS 配置是否正确
2. `index.css` 是否导入
3. 浏览器缓存清理

---

## 📚 相关文档

- **[Frontend README](frontend/README.md)** - 详细开发文档
- **[Iteration 4 交付报告](docs/iteration-4-delivery-report.md)** - 完整交付说明
- **[界面设计说明](界面设计.md)** - 设计规范
- **[API 文档](http://localhost:3000/api/docs)** - Swagger 接口文档

---

## ✅ 验收标准

### Phase 1（已完成）
- ✅ 前端项目可正常启动
- ✅ 所有路由可访问
- ✅ 布局和导航正常
- ✅ API 客户端可调用
- ✅ TypeScript 类型检查通过
- ✅ ESLint 检查通过

### Phase 2-5（待完成）
- [ ] 所有页面功能完整
- [ ] API 数据正常展示
- [ ] 表单验证正常
- [ ] WebSocket 推送正常
- [ ] E2E 测试通过
- [ ] 性能指标达标

---

## 🎉 下一步

1. **开始 Phase 2 开发**: 优先完成 Dashboard 和 TaskList 数据对接
2. **后端补充**: 完善 WebSocket Gateway
3. **测试**: 建立 E2E 测试用例

---

**当前状态**: ✅ 前端基础架构完成，开发环境就绪  
**下一里程碑**: Phase 2 核心页面开发

立即开始开发！🚀

