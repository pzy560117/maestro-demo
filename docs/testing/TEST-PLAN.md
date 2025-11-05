# 🧪 Maestro 前端功能测试计划

> 使用 Playwright MCP 进行端到端功能测试

## 📋 测试策略

### 测试方法
- **工具**: Playwright MCP
- **测试类型**: 端到端功能测试
- **测试方式**: 逐个测试用例，发现问题立即修复
- **浏览器**: Chrome（默认）

### 测试环境

**前置条件**:
```bash
# 1. 启动数据库
cd docker && docker-compose up -d postgres

# 2. 启动后端
cd backend && npm run start:dev

# 3. 启动前端
cd frontend && npm run dev

# 4. 验证服务
curl http://localhost:3000/api/v1/health
curl http://localhost:5173
```

## 🎯 测试用例清单

### Phase 1: 基础功能测试（优先级：P0）

#### TC001: 应用加载与导航
- **目的**: 验证应用能正常加载和导航
- **步骤**:
  1. 访问 http://localhost:5173
  2. 验证页面标题包含 "Maestro"
  3. 验证侧边栏菜单可见
  4. 点击各个菜单项，验证页面跳转
- **期望结果**:
  - 页面正常加载
  - 侧边栏显示所有菜单
  - 菜单点击后路由正确跳转
  - 控制台无错误日志

#### TC002: 仪表板显示
- **目的**: 验证仪表板数据展示
- **步骤**:
  1. 访问 /dashboard
  2. 验证统计卡片显示
  3. 验证图表渲染
  4. 检查数据加载状态
- **期望结果**:
  - 4个统计卡片正常显示
  - 图表正确渲染
  - 加载状态正确显示
  - API 请求成功

### Phase 2: 设备管理测试（优先级：P0）

#### TC003: 设备列表查看
- **目的**: 验证设备列表功能
- **步骤**:
  1. 访问 /devices
  2. 验证设备列表表格显示
  3. 检查表格列（序列号、型号、状态等）
  4. 验证空状态提示
- **期望结果**:
  - 设备列表正确显示
  - 表格列完整
  - 无数据时显示空状态
  - 控制台有 API 请求日志

#### TC004: 创建设备
- **目的**: 验证添加新设备功能
- **步骤**:
  1. 点击"添加设备"按钮
  2. 填写设备信息（序列号、型号、OS版本等）
  3. 点击提交
  4. 验证设备添加成功
- **期望结果**:
  - 表单正确显示
  - 必填字段验证生效
  - 提交成功后列表刷新
  - 显示成功提示

### Phase 3: 应用管理测试（优先级：P0）

#### TC005: 应用列表查看
- **目的**: 验证应用列表功能
- **步骤**:
  1. 访问 /apps
  2. 验证应用列表显示
  3. 检查应用信息（名称、包名、版本数）
  4. 验证版本展开功能
- **期望结果**:
  - 应用列表正确显示
  - 版本信息可展开/收起
  - 数据加载正确

#### TC006: 创建应用
- **目的**: 验证添加新应用功能
- **步骤**:
  1. 点击"添加应用"按钮
  2. 填写应用信息（名称、包名等）
  3. 点击提交
  4. 验证应用添加成功
- **期望结果**:
  - 表单验证正确
  - 提交成功
  - 列表更新

#### TC007: 创建应用版本
- **目的**: 验证为应用添加版本
- **步骤**:
  1. 选择一个应用
  2. 点击"添加版本"
  3. 填写版本信息
  4. 提交并验证
- **期望结果**:
  - 版本创建成功
  - 版本列表更新
  - 关联关系正确

### Phase 4: 任务管理测试（优先级：P0）

#### TC008: 任务列表查看
- **目的**: 验证任务列表功能
- **步骤**:
  1. 访问 /tasks
  2. 验证任务列表显示
  3. 检查任务状态筛选
  4. 测试搜索功能
- **期望结果**:
  - 任务列表正确显示
  - 状态筛选生效
  - 搜索功能正常

#### TC009: 创建遍历任务（核心功能）
- **目的**: 验证创建遍历任务功能
- **步骤**:
  1. 访问 /tasks/new
  2. 填写任务基本信息
    - 任务名称
    - 选择应用版本
    - 选择设备
  3. 配置遍历参数
    - 覆盖策略
    - 最大深度
    - 超时时间
  4. 提交任务
  5. 验证任务创建成功
- **期望结果**:
  - 表单所有字段可用
  - 下拉选项正确加载
  - 验证规则生效
  - 任务创建成功
  - WebSocket 收到任务更新

#### TC010: 查看任务详情
- **目的**: 验证任务详情页面
- **步骤**:
  1. 从任务列表点击任务
  2. 验证详情页面显示
  3. 检查任务信息完整性
  4. 验证任务状态实时更新
- **期望结果**:
  - 详情页正确显示
  - 所有信息完整
  - WebSocket 实时更新生效

#### TC011: 取消任务
- **目的**: 验证取消任务功能
- **步骤**:
  1. 创建一个任务
  2. 在详情页点击"取消任务"
  3. 确认取消
  4. 验证状态变更
- **期望结果**:
  - 取消按钮可用
  - 确认对话框显示
  - 状态更新为 CANCELLED
  - WebSocket 收到更新

### Phase 5: 截图库测试（优先级：P1）

#### TC012: 截图列表查看
- **目的**: 验证截图库功能
- **步骤**:
  1. 访问 /screens
  2. 验证截图网格显示
  3. 测试筛选功能
  4. 测试搜索功能
- **期望结果**:
  - 截图以网格形式显示
  - 缩略图正确加载
  - 筛选和搜索生效

#### TC013: 查看截图详情
- **目的**: 验证截图详情功能
- **步骤**:
  1. 点击一个截图
  2. 验证详情页显示
  3. 检查元素信息
  4. 验证相似截图推荐
- **期望结果**:
  - 详情页正确显示
  - 高清图片加载
  - 元素信息完整

### Phase 6: 告警中心测试（优先级：P1）

#### TC014: 告警列表查看
- **目的**: 验证告警中心功能
- **步骤**:
  1. 访问 /alerts
  2. 验证告警列表显示
  3. 测试严重程度筛选
  4. 测试状态筛选
- **期望结果**:
  - 告警列表正确显示
  - 筛选功能生效
  - 颜色标识清晰

#### TC015: 确认告警
- **目的**: 验证确认告警功能
- **步骤**:
  1. 选择一个未确认告警
  2. 点击确认
  3. 填写确认备注
  4. 提交
- **期望结果**:
  - 确认表单显示
  - 提交成功
  - 状态更新
  - WebSocket 实时更新

### Phase 7: 实时更新测试（优先级：P0）

#### TC016: WebSocket 连接
- **目的**: 验证 WebSocket 实时通信
- **步骤**:
  1. 打开应用
  2. 检查控制台 WebSocket 连接日志
  3. 验证连接状态
- **期望结果**:
  - WebSocket 连接成功
  - 控制台显示连接日志
  - 无连接错误

#### TC017: 任务状态实时更新
- **目的**: 验证任务状态实时推送
- **步骤**:
  1. 创建一个任务
  2. 观察任务状态变化
  3. 验证页面自动更新
- **期望结果**:
  - 状态自动更新
  - 无需手动刷新
  - WebSocket 事件正确接收

### Phase 8: 错误处理测试（优先级：P1）

#### TC018: 表单验证
- **目的**: 验证表单输入验证
- **步骤**:
  1. 在各个创建表单中
  2. 留空必填字段提交
  3. 输入无效数据提交
  4. 验证错误提示
- **期望结果**:
  - 必填字段提示显示
  - 格式验证生效
  - 错误信息清晰

#### TC019: API 错误处理
- **目的**: 验证 API 错误处理
- **步骤**:
  1. 模拟 API 错误（关闭后端）
  2. 执行操作
  3. 验证错误提示
- **期望结果**:
  - 显示友好错误信息
  - 控制台记录错误日志
  - 应用不崩溃

#### TC020: 网络断开恢复
- **目的**: 验证网络断开恢复机制
- **步骤**:
  1. 断开 WebSocket 连接
  2. 等待自动重连
  3. 验证功能恢复
- **期望结果**:
  - 自动重连成功
  - 功能正常恢复
  - 控制台显示重连日志

## 📊 测试执行记录

| 用例编号 | 用例名称 | 执行状态 | 发现问题 | 修复状态 | 执行时间 |
|---------|---------|---------|---------|---------|---------|
| TC001 | 应用加载与导航 | ✅ 通过 | 问题#1: 应用管理页面崩溃 | ✅ 已修复 | 2025-11-05 14:44 |
| TC002 | 仪表板显示 | ✅ 通过 | 问题#3-6: API端点和格式问题 | ✅ 已修复 | 2025-11-05 15:08 |
| TC003 | 设备列表查看 | ⏳ 待执行 | - | - | - |
| TC004 | 创建设备 | ⏳ 待执行 | - | - | - |
| TC005 | 应用列表查看 | ✅ 通过 | 无 | - | 2025-11-05 15:14 |
| TC006 | 创建应用 | ✅ 通过 | 无 | - | 2025-11-05 15:14 |
| TC007 | 创建应用版本 | ✅ 通过 | 问题#7: 前后端字段名不匹配 | ✅ 已修复 | 2025-11-05 15:18 |
| TC008 | 任务列表查看 | ✅ 通过 | 无 | - | 2025-11-05 15:22 |
| TC009 | 创建遍历任务 | 🔄 进行中 | 问题#8: 设备数据为空，阻塞任务创建 | 🔄 修复中 | 2025-11-05 15:30 |
| TC010 | 查看任务详情 | ⏳ 待执行 | - | - | - |
| TC011 | 取消任务 | ⏳ 待执行 | - | - | - |
| TC012 | 截图列表查看 | ⏳ 待执行 | - | - | - |
| TC013 | 查看截图详情 | ⏳ 待执行 | - | - | - |
| TC014 | 告警列表查看 | ⏳ 待执行 | - | - | - |
| TC015 | 确认告警 | ⏳ 待执行 | - | - | - |
| TC016 | WebSocket 连接 | ⏳ 待执行 | - | - | - |
| TC017 | 任务状态实时更新 | ⏳ 待执行 | - | - | - |
| TC018 | 表单验证 | ⏳ 待执行 | - | - | - |
| TC019 | API 错误处理 | ⏳ 待执行 | - | - | - |
| TC020 | 网络断开恢复 | ⏳ 待执行 | - | - | - |

## 📝 测试执行说明

### 测试顺序
1. 按 Phase 顺序执行
2. 同一 Phase 内按用例编号顺序
3. 发现问题立即记录并修复
4. 修复后重新执行该用例
5. 确认通过后继续下一个用例

### 问题记录格式
```markdown
## 问题 #1
- **用例**: TC001
- **描述**: 页面标题显示不正确
- **重现步骤**: ...
- **期望**: ...
- **实际**: ...
- **修复方案**: ...
- **修复状态**: ✅ 已修复
```

### 日志检查要点
- ✅ 控制台无红色错误
- ✅ API 请求日志完整
- ✅ WebSocket 连接成功
- ✅ 响应时间合理（< 500ms）

## 🚀 开始测试

准备好后，我们将使用 Playwright MCP 逐个执行测试用例。

测试命令：
```
使用 Playwright MCP 工具执行测试
```

---

**测试计划准备完成！** 📋  
现在可以开始逐个执行测试用例。

---

## 🐛 测试中发现的问题

### 问题 #1: 应用管理页面崩溃（前端空值检查）
- **用例**: TC001 - 应用加载与导航
- **发现时间**: 2025-11-05 14:42
- **严重程度**: P0（阻塞）
- **位置**: `frontend/src/modules/apps/AppList.tsx`
- **描述**: 访问 `/apps` 页面时，页面崩溃并显示白屏
- **错误信息**: 
  ```
  TypeError: Cannot read properties of undefined (reading 'length')
  at AppList (http://localhost:5173/src/modules/apps/AppList.tsx)
  ```
- **根本原因**: 
  - 第292行和422行代码缺少空值检查
  - 直接访问 `appsData.items.length` 和 `versionsData.items.length`
  - 当 API 返回的数据中 `items` 字段为 `undefined` 时导致崩溃
- **修复方案**: 
  - 在条件判断中添加 `items` 字段的空值检查
  - 从 `appsData.items.length` 改为 `appsData && appsData.items && appsData.items.length`
- **修复文件**: 
  - `frontend/src/modules/apps/AppList.tsx` (行 292, 422)
- **修复状态**: ✅ 已完成
- **修复时间**: 2025-11-05 14:44

### 问题 #2: 后端 API 分页格式不匹配
- **用例**: TC001 - 应用加载与导航
- **发现时间**: 2025-11-05 14:46
- **严重程度**: P0（阻塞）
- **位置**: `backend/src/modules/apps/`
- **描述**: 后端返回简单数组，前端期望分页响应格式
- **根本原因**: 
  - 应用和版本 API 未实现分页
  - 返回格式：`data: []`
  - 期望格式：`data: { items: [], total: 0, page: 1, limit: 20, totalPages: 0 }`
- **修复方案**: 
  - 参考设备模块的分页实现
  - 在 Service 层添加分页查询逻辑
  - 在 Controller 层添加分页参数接收
  - 返回符合前端期望的分页格式
- **修复文件**: 
  - `backend/src/modules/apps/apps.service.ts` - findAll 方法
  - `backend/src/modules/apps/apps.controller.ts` - findAll 方法，添加 Query 参数
  - `backend/src/modules/apps/app-versions.service.ts` - findAll, findByAppId 方法
  - `backend/src/modules/apps/app-versions.controller.ts` - findAll 方法
  - `backend/src/modules/apps/apps.controller.ts` - findVersions 嵌套路由方法
- **修复验证**: ✅ 已验证
  - API 返回正确的分页格式
  - 前端正常解析数据
  - 控制台无 API 错误
  - 统计卡片正确显示
- **修复状态**: ✅ 已完成
- **修复时间**: 2025-11-05 14:48

### 问题 #3: 后端缺少统计 API 端点
- **用例**: TC002 - 仪表板显示
- **发现时间**: 2025-11-05 14:52
- **严重程度**: P0（阻塞）
- **位置**: `backend/src/modules/tasks/`, `backend/src/modules/alerts/`
- **描述**: 前端请求 `/tasks/stats` 和 `/alerts/stats`，但后端缺少这些端点
- **根本原因**: 
  - 仪表盘需要统计 API，但后端未实现
  - `/tasks/stats` 完全缺失
  - `/alerts/statistics` 路径不匹配（应为 `/alerts/stats`）
  - 路由顺序错误：`stats` 在 `:id` 之后导致被误认为 UUID
- **修复方案**: 
  - 添加 tasks.service.ts 的 getStats() 方法
  - 添加 tasks.controller.ts 的 stats 端点
  - 修改 alerts.controller.ts 路由从 `statistics` 改为 `stats`
  - 修改 alerts.service.ts 返回格式，添加 pending、acked、resolved、critical 字段
  - 调整路由顺序，将 stats 和 queue/pending 移到 :id 之前
- **修复文件**: 
  - `backend/src/modules/tasks/tasks.controller.ts` - 添加 stats 端点，重排路由
  - `backend/src/modules/tasks/tasks.service.ts` - 添加 getStats 方法
  - `backend/src/modules/alerts/alerts.controller.ts` - 修改路由名称
  - `backend/src/modules/alerts/alerts.service.ts` - 修改返回格式
- **修复状态**: ✅ 已完成
- **修复时间**: 2025-11-05 15:00

### 问题 #4: Tasks API 分页参数不匹配
- **用例**: TC002 - 仪表板显示
- **发现时间**: 2025-11-05 15:02
- **严重程度**: P0（阻塞）
- **描述**: 前端使用 `page` 参数，后端期望 `offset` 参数
- **根本原因**: Tasks 模块使用 offset/limit 而非 page/limit
- **修复方案**: 统一为 page/limit 分页方式
- **修复文件**: 
  - `backend/src/modules/tasks/tasks.controller.ts`
  - `backend/src/modules/tasks/tasks.service.ts`
- **修复状态**: ✅ 已完成
- **修复时间**: 2025-11-05 15:04

### 问题 #5: Alerts DTO 分页参数不一致
- **用例**: TC002 - 仪表板显示
- **发现时间**: 2025-11-05 15:05
- **严重程度**: P0（阻塞）
- **描述**: QueryAlertDto 使用 `pageSize` 而不是 `limit`
- **根本原因**: Alerts 模块参数命名不一致
- **修复方案**: 将 pageSize 统一改为 limit
- **修复文件**: 
  - `backend/src/modules/alerts/dto/query-alert.dto.ts`
  - `backend/src/modules/alerts/alerts.service.ts`
- **修复状态**: ✅ 已完成
- **修复时间**: 2025-11-05 15:06

### 问题 #6: Alerts API 返回格式不统一
- **用例**: TC002 - 仪表板显示
- **发现时间**: 2025-11-05 15:06
- **严重程度**: P0（阻塞）
- **描述**: alerts.controller返回 `{data: [], pagination: {}}` 导致前端崩溃
- **根本原因**: 返回格式与其他模块不一致
- **修复方案**: 统一返回 `{data: {items: [], total:, page:, limit:, totalPages:}}`
- **修复文件**: `backend/src/modules/alerts/alerts.controller.ts`
- **修复状态**: ✅ 已完成
- **修复时间**: 2025-11-05 15:07

### 问题 #7: 前后端字段名称不匹配（应用版本）
- **用例**: TC007 - 创建应用版本
- **发现时间**: 2025-11-05 15:15
- **严重程度**: P0（阻塞）
- **位置**: `backend/src/modules/apps/`
- **描述**: 创建应用版本时返回 400 Bad Request
- **错误信息**: 
  ```
  AxiosError: Request failed with status code 400
  ```
- **根本原因**: 
  - 前端发送字段：`version`, `releaseNotes`
  - 后端 DTO 期望：`versionName`, `changelog`（匹配 Prisma schema 字段）
  - 数据库 schema 使用：`versionName`, `changelog`
- **修复方案**: 
  - DTO 层接收前端字段名（`version`, `releaseNotes`）
  - Service 层做字段映射：DTO → Prisma（`version` → `versionName`, `releaseNotes` → `changelog`）
  - Response DTO 做反向映射：Prisma → 前端（`versionName` → `version`, `changelog` → `releaseNotes`）
- **修复文件**: 
  - `backend/src/modules/apps/dto/create-app-version.dto.ts` - 字段名改为 version, releaseNotes
  - `backend/src/modules/apps/app-versions.service.ts` - create 和 update 方法中添加字段映射
  - `backend/src/modules/apps/dto/app-response.dto.ts` - 构造函数中添加字段映射
- **修复验证**: ✅ 已验证
  - 版本创建成功
  - API 返回正确的字段名
  - 前端正常显示版本信息
- **修复状态**: ✅ 已完成
- **修复时间**: 2025-11-05 15:18

### 问题 #8: 前后端字段名称不匹配（设备管理）
- **用例**: TC009 - 创建遍历任务（阻塞：无可用设备）
- **发现时间**: 2025-11-05 15:26
- **严重程度**: P0（阻塞）
- **位置**: `backend/src/modules/devices/`
- **描述**: 创建设备时返回 400 Bad Request
- **错误信息**: 
  ```
  AxiosError: Request failed with status code 400
  API错误: 请求参数错误
  ```
- **根本原因**: 
  - 前端发送字段：`serialNumber`, `androidVersion`, `type`, `tags: string[]`
  - 后端 DTO 期望：`serial`, `osVersion` (格式: `Android X`), `deviceType`, `tags: Record<string, unknown>`
  - Prisma schema 使用：`serial`, `osVersion`, `deviceType`, `tags: Json`
- **修复方案**: 
  - DTO 层接收前端字段名（`serialNumber`, `androidVersion`, `type`, `tags: string[]`）
  - 移除 osVersion 格式验证，在 Service 层自动添加 "Android" 前缀
  - Service 层做字段映射：
    - `serialNumber` → `serial`
    - `androidVersion` → `osVersion` (添加"Android "前缀)
    - `type` → `deviceType`
    - `tags: string[]` → `tags: Json` (数组转换为对象)
  - Response DTO 做反向映射：
    - `serial` → `serialNumber`
    - `osVersion` → `androidVersion` (移除"Android "前缀)
    - `deviceType` → `type`
    - `tags: Json` → `tags: string[]` (对象转换为数组)
- **修复文件**: 
  - `backend/src/modules/devices/dto/create-device.dto.ts` - 字段名和验证规则
  - `backend/src/modules/devices/devices.service.ts` - create 方法中添加字段映射
  - `backend/src/modules/devices/dto/device-response.dto.ts` - 构造函数中添加字段映射
- **修复状态**: ✅ 代码已修复
- **验证状态**: ⏳ 待重启后端服务验证
- **修复时间**: 2025-11-05 15:30

