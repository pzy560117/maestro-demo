# 🚀 Maestro 后端快速参考

## 常用命令速查

### 启动与重启
```bash
# 清理并重启（推荐）
npm run restart

# 只清理后端
npm run kill:backend

# 正常启动
npm run start:dev

# 启动 Appium 3（命令行）
"C:\Users\PZY666\AppData\Roaming\npm\appium.cmd" \
  --address 127.0.0.1 \
  --port 4723 \
  --use-drivers uiautomator2 \
  --log C:\Temp\appium.log \
  --log-level debug
```

### 批处理工具
```bash
# Windows 批处理
scripts\kill-backend.bat      # 清理后端
scripts\restart-backend.bat   # 清理并重启
scripts\kill-all-services.bat # 清理所有服务
scripts\kill-port.bat 8360    # 清理指定端口
```

### 设备管理
```bash
# 查看设备
adb devices

# 重启 ADB
adb kill-server && adb start-server

# 释放数据库中的设备
docker exec maestro-postgres psql -U maestro -d maestro -c \
  "UPDATE devices SET status = 'AVAILABLE';"
```

### 健康检查
```bash
# 修复卡住的任务
curl -X POST http://localhost:8360/api/v1/orchestrator/health/fix-stuck-tasks

# 查看调度器状态
curl http://localhost:8360/api/v1/orchestrator/status

# 启动调度器
curl -X POST http://localhost:8360/api/v1/orchestrator/scheduler/start
```

### 日志查询
```bash
# 查看任务运行详情
curl http://localhost:8360/api/v1/orchestrator/task-runs/:taskRunId

# 数据库查询事件
docker exec maestro-postgres psql -U maestro -d maestro -c \
  "SELECT event_type, detail, occurred_at FROM task_run_events \
   WHERE task_run_id = 'xxx' ORDER BY occurred_at DESC LIMIT 10;"
```

## 常见问题快速修复

| 问题 | 命令 |
|------|------|
| 端口 8360 被占用 | `npm run restart` |
| 任务卡在 QUEUED | 检查调度器：`curl http://localhost:8360/api/v1/orchestrator/status` |
| 任务卡在 RUNNING | `curl -X POST http://localhost:8360/api/v1/orchestrator/health/fix-stuck-tasks` |
| 设备显示 BUSY | `UPDATE devices SET status = 'AVAILABLE';` |
| Appium 无法找到设备 | `adb kill-server && adb start-server` |
| 数据库连接失败 | `cd docker && docker-compose up -d` |

## 服务端口

| 服务 | 端口 | URL |
|------|------|-----|
| 后端 API | 8360 | http://localhost:8360 |
| API 文档 | 8360 | http://localhost:8360/api/docs |
| Appium | 4723 | http://localhost:4723 |
| 前端 | 5173 | http://localhost:5173 |
| Postgres | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| MinIO | 9000 | http://localhost:9000 |

## 开发工作流

```bash
# 1. 启动基础服务
cd docker && docker-compose up -d

# 2. 启动 Appium
appium

# 3. 启动后端（自动清理）
cd backend && npm run restart

# 4. 启动前端
cd frontend && npm run dev

# 5. 访问前端
# http://localhost:5173
```

## 完整文档

📖 详细问题排查指南：[docs/guides/BACKEND-TROUBLESHOOTING.md](../docs/guides/BACKEND-TROUBLESHOOTING.md)

