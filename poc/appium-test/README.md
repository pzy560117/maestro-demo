# Appium PoC验证

## 目标

验证Appium环境配置是否正确，能否正常连接Android设备并执行基本操作。

## 前置条件

1. **安装Appium Server**
   ```bash
   npm install -g appium
   appium driver install uiautomator2
   ```

2. **启动Appium Server**
   ```bash
   appium
   ```

3. **确保Android设备/模拟器在线**
   ```bash
   adb devices
   ```

4. **安装依赖**
   ```bash
   cd poc/appium-test
   pnpm install
   ```

## 运行测试

```bash
pnpm test
```

## 环境变量（可选）

- `DEVICE_NAME`: 设备序列号（默认: emulator-5554）
- `PLATFORM_VERSION`: Android版本（默认: 13）
- `APPIUM_HOST`: Appium Server地址（默认: localhost）
- `APPIUM_PORT`: Appium Server端口（默认: 4723）

示例：
```bash
DEVICE_NAME=emulator-5556 pnpm test
```

## 验收标准

✅ 成功连接Appium Server
✅ 获取设备信息
✅ 获取应用信息
✅ 获取屏幕尺寸
✅ 获取页面DOM
✅ 查找UI元素
✅ 截图功能

## 常见问题

### 1. ECONNREFUSED错误
**原因**: Appium Server未启动
**解决**: 运行 `appium` 启动服务

### 2. No devices found
**原因**: 设备未连接或ADB不可用
**解决**: 
- 检查 `adb devices`
- 重启ADB: `adb kill-server && adb start-server`
- 确保模拟器已启动

### 3. Session创建失败
**原因**: UiAutomator2驱动未安装
**解决**: `appium driver install uiautomator2`

## 下一步

通过此PoC后，可以开始开发：
- Traversal Orchestrator状态机
- LLM指令生成模块
- MidSceneJS视觉定位集成

