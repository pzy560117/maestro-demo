import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/common/prisma/prisma.service';

/**
 * E2E集成测试
 * 测试完整的API流程
 */
describe('Maestro E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // 配置与生产环境一致的管道
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('/api/v1');

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    
    // 清理测试数据库
    await prisma.cleanDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Health Check', () => {
    it('/api/v1/health (GET) should return OK', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);
    });
  });

  describe('Devices API', () => {
    let deviceId: string;

    it('/api/v1/devices (POST) should create a device', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/devices')
        .send({
          serial: 'test-device-001',
          model: 'Test Device',
          osVersion: 'Android 13',
          deviceType: 'EMULATOR',
          resolution: '1080x1920',
        })
        .expect(201);

      expect(response.body).toHaveProperty('code', 0);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.serial).toBe('test-device-001');

      deviceId = response.body.data.id;
    });

    it('/api/v1/devices (POST) should reject duplicate device', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/devices')
        .send({
          serial: 'test-device-001',
          model: 'Test Device',
          osVersion: 'Android 13',
          deviceType: 'EMULATOR',
        })
        .expect(409);

      expect(response.body.code).not.toBe(0);
      expect(response.body.message).toContain('已存在');
    });

    it('/api/v1/devices (GET) should return device list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/devices')
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('/api/v1/devices/:id (GET) should return device details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/devices/${deviceId}`)
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(deviceId);
    });

    it('/api/v1/devices/:id (PATCH) should update device', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/devices/${deviceId}`)
        .send({
          status: 'OFFLINE',
        })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.status).toBe('OFFLINE');
    });

    it('/api/v1/devices/:id (DELETE) should delete device', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/devices/${deviceId}`)
        .expect(204);
    });
  });

  describe('Apps API', () => {
    let appId: string;
    let versionId: string;

    it('/api/v1/apps (POST) should create an app', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/apps')
        .send({
          name: '测试应用',
          packageName: 'com.test.app',
          description: '用于E2E测试的应用',
        })
        .expect(201);

      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('测试应用');

      appId = response.body.data.id;
    });

    it('/api/v1/app-versions (POST) should create an app version', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/app-versions')
        .send({
          appId,
          versionName: '1.0.0',
          versionCode: 100,
          changelog: '初始版本',
        })
        .expect(201);

      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.versionName).toBe('1.0.0');

      versionId = response.body.data.id;
    });

    it('/api/v1/app-versions?appId=xxx (GET) should return versions for app', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/app-versions?appId=${appId}`)
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('/api/v1/apps/:id (GET) should return app details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/apps/${appId}`)
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBe(appId);
    });
  });

  describe('Validation', () => {
    it('should reject invalid device data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/devices')
        .send({
          serial: 'test',
          model: 'Test',
          osVersion: 'InvalidVersion', // 不符合格式
          deviceType: 'INVALID', // 无效枚举值
        })
        .expect(400);

      expect(response.body.code).not.toBe(0);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/apps')
        .send({
          name: '测试应用',
          // 缺少 packageName
        })
        .expect(400);

      expect(response.body.code).not.toBe(0);
    });
  });
});

