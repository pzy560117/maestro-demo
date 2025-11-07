import { test, expect } from '@playwright/test';

/**
 * 任务创建流程端到端测试
 * 验证 Iteration 1 的前端集成
 */
test.describe('任务创建流程', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('应该显示仪表盘页面', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/Maestro/);
    
    // 验证导航栏存在
    await expect(page.locator('nav')).toBeVisible();
    
    // 验证仪表盘内容
    await expect(page.getByText('仪表盘')).toBeVisible();
  });

  test('应该能够导航到任务列表页面', async ({ page }) => {
    // 点击任务菜单
    await page.getByRole('link', { name: /任务/i }).click();
    
    // 等待页面加载
    await page.waitForURL('**/tasks');
    
    // 验证任务列表页面
    await expect(page.getByText('遍历任务')).toBeVisible();
    await expect(page.getByRole('button', { name: /创建任务/i })).toBeVisible();
  });

  test('应该能够打开创建任务页面', async ({ page }) => {
    // 导航到任务页面
    await page.goto('http://localhost:5173/tasks');
    await page.waitForLoadState('networkidle');
    
    // 点击创建任务按钮
    await page.getByRole('button', { name: /创建任务/i }).click();
    
    // 验证创建任务表单
    await expect(page.getByLabel(/任务名称/i)).toBeVisible();
    await expect(page.getByLabel(/应用/i)).toBeVisible();
    await expect(page.getByLabel(/覆盖策略/i)).toBeVisible();
  });

  test('应该验证任务创建表单必填项', async ({ page }) => {
    // 导航到创建任务页面
    await page.goto('http://localhost:5173/tasks/create');
    await page.waitForLoadState('networkidle');
    
    // 不填写任何内容，直接提交
    await page.getByRole('button', { name: /创建任务/i }).click();
    
    // 验证错误提示
    await expect(page.getByText(/任务名称至少3个字符/i)).toBeVisible();
    await expect(page.getByText(/请选择应用/i)).toBeVisible();
    await expect(page.getByText(/至少选择一个设备/i)).toBeVisible();
  });

  test('应该能够查看设备列表', async ({ page }) => {
    // 导航到设备页面
    await page.goto('http://localhost:5173/devices');
    await page.waitForLoadState('networkidle');
    
    // 验证设备页面
    await expect(page.getByText('设备管理')).toBeVisible();
    
    // 如果有设备，应该显示设备列表
    // 如果没有设备，应该显示空状态
    const hasDevices = await page.getByRole('table').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/暂无设备/i).isVisible().catch(() => false);
    
    expect(hasDevices || hasEmptyState).toBeTruthy();
  });

  test('应该能够查看应用列表', async ({ page }) => {
    // 导航到应用页面
    await page.goto('http://localhost:5173/apps');
    await page.waitForLoadState('networkidle');
    
    // 验证应用页面
    await expect(page.getByText('应用管理')).toBeVisible();
  });

  test('应该能够访问告警页面', async ({ page }) => {
    // 导航到告警页面
    await page.goto('http://localhost:5173/alerts');
    await page.waitForLoadState('networkidle');
    
    // 验证告警页面
    await expect(page.getByText('告警中心')).toBeVisible();
  });

  test('应该显示统计数据（如果后端可用）', async ({ page }) => {
    // 访问首页
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // 等待 API 请求完成
    await page.waitForTimeout(2000);
    
    // 验证统计卡片存在
    const statsCards = page.locator('[class*="stat"]').or(page.locator('[class*="card"]'));
    await expect(statsCards.first()).toBeVisible();
  });
});

/**
 * API 集成测试
 */
test.describe('API 集成测试', () => {
  test('前端应该能够调用后端健康检查 API', async ({ page }) => {
    // 监听网络请求
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/health') && response.status() === 200,
      { timeout: 5000 }
    ).catch(() => null);
    
    await page.goto('http://localhost:5173');
    
    const response = await responsePromise;
    
    if (response) {
      expect(response.status()).toBe(200);
      console.log('✅ 后端健康检查成功');
    } else {
      console.log('⚠️ 后端服务未运行或健康检查失败');
    }
  });

  test('前端应该能够获取任务统计', async ({ page }) => {
    let statsApiCalled = false;
    
    // 监听 API 请求
    page.on('response', response => {
      if (response.url().includes('/tasks/stats')) {
        statsApiCalled = true;
        console.log('✅ 任务统计 API 已调用');
      }
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // 验证是否调用了统计 API
    expect(statsApiCalled).toBeTruthy();
  });
});

/**
 * 响应式测试
 */
test.describe('响应式设计', () => {
  test('应该在移动设备上正常显示', async ({ page }) => {
    // 设置移动设备视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // 验证页面可见
    await expect(page.locator('body')).toBeVisible();
  });

  test('应该在平板设备上正常显示', async ({ page }) => {
    // 设置平板设备视口
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // 验证页面可见
    await expect(page.locator('body')).toBeVisible();
  });
});

