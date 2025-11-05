import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/common/prisma/prisma.service';
import { ScreenOrientation, ElementVisibility } from '@prisma/client';

/**
 * API 集成测试
 * 测试完整的业务流程，确保前后端对接正确
 * 
 * 测试场景：
 * 1. 设备管理流程
 * 2. 应用版本管理流程
 * 3. 任务创建和执行流程
 * 4. 界面和元素管理流程
 * 5. 告警创建和处理流程
 */
describe('API Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 测试数据ID存储
  const testData = {
    deviceId: '',
    appId: '',
    appVersionId: '',
    taskId: '',
    taskRunId: '',
    screenId: '',
    elementId: '',
    alertId: '',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 配置全局验证管道（与main.ts保持一致）
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.setGlobalPrefix('/api/v1');

    await app.init();

    prisma = app.get(PrismaService);

    // 清理所有测试数据，确保从干净状态开始
    await prisma.alert.deleteMany({});
    await prisma.taskRun.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.element.deleteMany({});
    await prisma.screen.deleteMany({});
    await prisma.appVersion.deleteMany({});
    await prisma.app.deleteMany({});
    await prisma.device.deleteMany({});
  });

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData();
    await app.close();
  });

  /**
   * 清理测试数据
   */
  async function cleanupTestData() {
    try {
      // 删除顺序：子表 -> 父表
      if (testData.alertId) {
        await prisma.alert.deleteMany({
          where: { id: testData.alertId },
        });
      }

      if (testData.taskRunId) {
        await prisma.taskRun.deleteMany({
          where: { id: testData.taskRunId },
        });
      }

      if (testData.taskId) {
        await prisma.task.deleteMany({
          where: { id: testData.taskId },
        });
      }

      if (testData.elementId) {
        await prisma.element.deleteMany({
          where: { id: testData.elementId },
        });
      }

      if (testData.screenId) {
        await prisma.screen.deleteMany({
          where: { id: testData.screenId },
        });
      }

      if (testData.appVersionId) {
        await prisma.appVersion.deleteMany({
          where: { id: testData.appVersionId },
        });
      }

      if (testData.appId) {
        await prisma.app.deleteMany({
          where: { id: testData.appId },
        });
      }

      if (testData.deviceId) {
        await prisma.device.deleteMany({
          where: { id: testData.deviceId },
        });
      }
    } catch (error) {
      console.error('清理测试数据失败:', error);
    }
  }

  describe('1. 设备管理流程', () => {
    it('POST /api/v1/devices - 创建设备', async () => {
      // 创建设备（ADB检查会返回OFFLINE）
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/devices')
        .send({
          serial: 'test-device-001',
          model: 'Test Pixel 6',
          osVersion: 'Android 13',
          deviceType: 'EMULATOR',
          resolution: '1080x1920',
          tags: { test: true },
        })
        .expect(201);

      expect(createRes.body.code).toBe(0);
      expect(createRes.body.data).toHaveProperty('id');
      expect(createRes.body.data.serial).toBe('test-device-001');
      testData.deviceId = createRes.body.data.id;

      // 测试环境无真实设备，手动更新状态为AVAILABLE（模拟设备上线）
      await request(app.getHttpServer())
        .patch(`/api/v1/devices/${testData.deviceId}`)
        .send({ status: 'AVAILABLE' })
        .expect(200);
    });

    it('GET /api/v1/devices - 查询设备列表', () => {
      return request(app.getHttpServer())
        .get('/api/v1/devices')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('GET /api/v1/devices/:id - 查询设备详情', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/devices/${testData.deviceId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.id).toBe(testData.deviceId);
          expect(res.body.data.serial).toBe('test-device-001');
        });
    });

    it('PATCH /api/v1/devices/:id - 更新设备', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/devices/${testData.deviceId}`)
        .send({
          tags: { test: true, updated: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.tags).toHaveProperty('updated', true);
        });
    });
  });

  describe('2. 应用版本管理流程', () => {
    it('POST /api/v1/apps - 创建应用', () => {
      return request(app.getHttpServer())
        .post('/api/v1/apps')
        .send({
          name: '测试应用',
          packageName: 'com.test.integration',
          description: 'API集成测试应用',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.packageName).toBe('com.test.integration');
          testData.appId = res.body.data.id;
        });
    });

    it('POST /api/v1/apps/:id/versions - 创建应用版本', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/apps/${testData.appId}/versions`)
        .send({
          versionName: '1.0.0-test',
          versionCode: 100,
          apkHash: 'test-hash-123456',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.versionName).toBe('1.0.0-test');
          testData.appVersionId = res.body.data.id;
        });
    });

    it('GET /api/v1/apps - 查询应用列表', () => {
      return request(app.getHttpServer())
        .get('/api/v1/apps')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/v1/apps/:id/versions - 查询应用版本列表', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/apps/${testData.appId}/versions`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });
  });

  describe('3. 任务创建和管理流程', () => {
    it('POST /api/v1/tasks - 创建遍历任务', async () => {
      // 调试：先验证testData
      expect(testData.appVersionId).toBeTruthy();
      expect(testData.deviceId).toBeTruthy();

      const response = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .send({
          name: '集成测试任务',
          appVersionId: testData.appVersionId,
          deviceIds: [testData.deviceId],
          coverageProfile: 'SMOKE',
          priority: 3,
          coverageConfig: {
            blacklistPaths: ['/settings', '/about'],
            maxDepth: 5,
          },
        });

      // 调试：输出响应
      if (response.status !== 201) {
        console.log('POST /tasks failed:', response.status, response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('集成测试任务');
      expect(response.body.status).toBe('QUEUED');
      testData.taskId = response.body.id;
    });

    it('GET /api/v1/tasks - 查询任务列表', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tasks')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('tasks');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.tasks)).toBe(true);
        });
    });

    it('GET /api/v1/tasks/:id - 查询任务详情', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tasks/${testData.taskId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testData.taskId);
          expect(res.body).toHaveProperty('appVersion');
        });
    });

    it('POST /api/v1/tasks/:id/cancel - 取消任务', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/tasks/${testData.taskId}/cancel`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testData.taskId);
          expect(res.body.status).toBe('CANCELLED');
        });
    });

    it('GET /api/v1/tasks/queue/pending - 获取待执行任务队列', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tasks/queue/pending')
        .query({ limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('4. 界面和元素管理流程', () => {
    it('POST /api/v1/screens - 创建界面记录（模拟）', async () => {
      // 注意：实际需要上传文件，这里使用模拟数据
      const screenData = {
        appVersionId: testData.appVersionId,
        screenshotPath: 'test/screenshot.png',
        domPath: 'test/dom.json',
        orientation: ScreenOrientation.PORTRAIT,
        width: 1080,
        height: 1920,
        primaryText: '测试界面',
        elements: [
          {
            elementType: 'Button',
            resourceId: 'com.test:id/submit',
            textValue: '提交',
            bounds: { x: 100, y: 200, width: 300, height: 50 },
            visibility: ElementVisibility.VISIBLE,
            interactable: true,
          },
        ],
      };

      // 直接通过 Prisma 创建，因为文件上传在集成测试中较复杂
      const screen = await prisma.screen.create({
        data: {
          signature: 'test-screen-sig-001',
          appVersionId: screenData.appVersionId,
          screenshotPath: screenData.screenshotPath,
          domPath: screenData.domPath,
          domHash: 'test-dom-hash-001',
          orientation: screenData.orientation,
          width: screenData.width,
          height: screenData.height,
          primaryText: screenData.primaryText,
          capturedAt: new Date(),
        },
      });

      testData.screenId = screen.id;

      const element = await prisma.element.create({
        data: {
          screenId: screen.id,
          elementHash: 'test-element-hash-001',
          elementType: screenData.elements[0].elementType,
          resourceId: screenData.elements[0].resourceId,
          textValue: screenData.elements[0].textValue,
          bounds: screenData.elements[0].bounds,
          visibility: screenData.elements[0].visibility,
          interactable: screenData.elements[0].interactable,
        },
      });

      testData.elementId = element.id;

      expect(screen.id).toBeDefined();
      expect(element.id).toBeDefined();
    });

    it('GET /api/v1/screens/:id - 查询界面详情', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/screens/${testData.screenId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testData.screenId);
        });
    });

    it('GET /api/v1/screens/:id/elements - 查询界面元素', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/screens/${testData.screenId}/elements`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('GET /api/v1/screens/app-version/:appVersionId - 查询应用版本的所有界面', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/screens/app-version/${testData.appVersionId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('screens');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.screens)).toBe(true);
        });
    });
  });

  describe('5. 告警创建和处理流程', () => {
    it('POST /api/v1/alerts - 创建告警', () => {
      return request(app.getHttpServer())
        .post('/api/v1/alerts')
        .send({
          alertType: 'LOCATOR_FAILURE',
          severity: 'P2',
          message: '集成测试告警：定位失败',
          screenId: testData.screenId,
          elementId: testData.elementId,
          payload: {
            testData: true,
            failureCount: 1,
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.alertType).toBe('LOCATOR_FAILURE');
          testData.alertId = res.body.data.id;
        });
    });

    it('GET /api/v1/alerts - 查询告警列表', () => {
      return request(app.getHttpServer())
        .get('/api/v1/alerts')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/v1/alerts/statistics - 获取告警统计', () => {
      return request(app.getHttpServer())
        .get('/api/v1/alerts/statistics')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data).toHaveProperty('bySeverity');
          expect(res.body.data).toHaveProperty('byType');
        });
    });

    it('GET /api/v1/alerts/:id - 查询告警详情', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/alerts/${testData.alertId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.id).toBe(testData.alertId);
        });
    });

    it('PATCH /api/v1/alerts/:id/acknowledge - 确认告警', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/alerts/${testData.alertId}/acknowledge`)
        .send({
          ackBy: testData.deviceId, // 使用已存在的UUID
          note: '已确认，正在处理',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.status).toBe('ACKED');
        });
    });

    it('PATCH /api/v1/alerts/:id/resolve - 解决告警', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/alerts/${testData.alertId}/resolve`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.status).toBe('RESOLVED');
        });
    });
  });

  describe('6. 健康检查和系统状态', () => {
    it('GET /api/v1/health - 健康检查', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });
});

