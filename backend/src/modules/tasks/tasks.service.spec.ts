import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { TaskStatus, CoverageProfile, DeviceStatus } from '@prisma/client';

/**
 * 任务服务单元测试
 * 测试功能 B：遍历任务创建与管理（FR-01）
 * 
 * 验收标准：
 * 1. 未选择设备提交时，提示"请选择至少一台设备"
 * 2. 同一个设备若已有运行任务，提示"设备正忙"
 * 3. 创建成功后，可在任务列表看到新任务，状态 QUEUED
 * 4. API POST /tasks 返回任务 ID，并在 DB tasks 表有记录
 */
describe('TasksService', () => {
  let service: TasksService;
  let prisma: PrismaService;

  const mockPrismaService = {
    appVersion: {
      findUnique: jest.fn(),
    },
    device: {
      findMany: jest.fn(),
    },
    taskRun: {
      findMany: jest.fn(),
    },
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createTaskDto = {
      name: '审批核心流程遍历',
      appVersionId: 'app-version-id',
      deviceIds: ['device-id-1'],
      coverageProfile: CoverageProfile.SMOKE,
      priority: 3,
    };

    it('验收1：应用版本不存在时抛出异常', async () => {
      mockPrismaService.appVersion.findUnique.mockResolvedValue(null);

      await expect(service.create(createTaskDto)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.create(createTaskDto)).rejects.toThrow('应用版本');
    });

    it('验收2：设备不存在时抛出异常', async () => {
      mockPrismaService.appVersion.findUnique.mockResolvedValue({
        id: 'app-version-id',
        versionName: '1.0.0',
        app: { name: 'Test App', packageName: 'com.test.app' },
      });
      mockPrismaService.device.findMany.mockResolvedValue([]);

      await expect(service.create(createTaskDto)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.create(createTaskDto)).rejects.toThrow('设备不存在');
    });

    it('验收3：设备状态不可用时抛出异常', async () => {
      mockPrismaService.appVersion.findUnique.mockResolvedValue({
        id: 'app-version-id',
        versionName: '1.0.0',
        app: { name: 'Test App', packageName: 'com.test.app' },
      });
      mockPrismaService.device.findMany.mockResolvedValue([
        {
          id: 'device-id-1',
          serial: 'emulator-5554',
          status: DeviceStatus.OFFLINE,
        },
      ]);

      await expect(service.create(createTaskDto)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.create(createTaskDto)).rejects.toThrow('设备不可用');
    });

    it('验收4：设备正忙时抛出异常', async () => {
      mockPrismaService.appVersion.findUnique.mockResolvedValue({
        id: 'app-version-id',
        versionName: '1.0.0',
        app: { name: 'Test App', packageName: 'com.test.app' },
      });
      mockPrismaService.device.findMany.mockResolvedValue([
        {
          id: 'device-id-1',
          serial: 'emulator-5554',
          status: DeviceStatus.AVAILABLE,
        },
      ]);
      mockPrismaService.taskRun.findMany.mockResolvedValue([
        {
          id: 'task-run-id',
          deviceId: 'device-id-1',
          status: 'RUNNING',
          device: { serial: 'emulator-5554' },
          task: { name: '其他任务' },
        },
      ]);

      await expect(service.create(createTaskDto)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.create(createTaskDto)).rejects.toThrow('设备正忙');
    });

    it('验收5：黑名单路径超限时抛出异常', async () => {
      mockPrismaService.appVersion.findUnique.mockResolvedValue({
        id: 'app-version-id',
        versionName: '1.0.0',
        app: { name: 'Test App', packageName: 'com.test.app' },
      });
      mockPrismaService.device.findMany.mockResolvedValue([
        {
          id: 'device-id-1',
          serial: 'emulator-5554',
          status: DeviceStatus.AVAILABLE,
        },
      ]);
      mockPrismaService.taskRun.findMany.mockResolvedValue([]);

      const dtoWithManyBlacklists = {
        ...createTaskDto,
        coverageConfig: {
          blacklistPaths: Array(51).fill('/test'),
        },
      };

      await expect(service.create(dtoWithManyBlacklists)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.create(dtoWithManyBlacklists)).rejects.toThrow(
        '黑名单路径数量不能超过50',
      );
    });

    it('验收6：成功创建任务，状态为 QUEUED', async () => {
      const mockTask = {
        id: 'task-id',
        name: '审批核心流程遍历',
        appVersionId: 'app-version-id',
        coverageProfile: CoverageProfile.SMOKE,
        coverageConfig: {},
        priority: 3,
        status: TaskStatus.QUEUED,
        createdAt: new Date(),
        updatedAt: new Date(),
        appVersion: {
          id: 'app-version-id',
          versionName: '1.0.0',
          app: { name: 'Test App', packageName: 'com.test.app' },
        },
      };

      mockPrismaService.appVersion.findUnique.mockResolvedValue({
        id: 'app-version-id',
        versionName: '1.0.0',
        app: { name: 'Test App', packageName: 'com.test.app' },
      });
      mockPrismaService.device.findMany.mockResolvedValue([
        {
          id: 'device-id-1',
          serial: 'emulator-5554',
          status: DeviceStatus.AVAILABLE,
        },
      ]);
      mockPrismaService.taskRun.findMany.mockResolvedValue([]);
      mockPrismaService.task.create.mockResolvedValue(mockTask);

      const result = await service.create(createTaskDto);

      expect(result.id).toBe('task-id');
      expect(result.status).toBe(TaskStatus.QUEUED);
      expect(result.name).toBe('审批核心流程遍历');
      expect(mockPrismaService.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TaskStatus.QUEUED,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('应返回任务列表和总数', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          name: '任务1',
          status: TaskStatus.QUEUED,
          createdAt: new Date(),
          updatedAt: new Date(),
          appVersion: {
            id: 'app-version-id',
            versionName: '1.0.0',
            app: { name: 'Test App', packageName: 'com.test.app' },
          },
        },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.task.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('cancel', () => {
    it('应成功取消 QUEUED 状态的任务', async () => {
      const mockTask = {
        id: 'task-id',
        name: '测试任务',
        status: TaskStatus.QUEUED,
        appVersion: {
          id: 'app-version-id',
          versionName: '1.0.0',
          app: { name: 'Test App', packageName: 'com.test.app' },
        },
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.FAILED,
      });

      const result = await service.cancel('task-id');

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: TaskStatus.FAILED },
        }),
      );
    });

    it('应拒绝取消已完成的任务', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        id: 'task-id',
        status: TaskStatus.COMPLETED,
      });

      await expect(service.cancel('task-id')).rejects.toThrow(
        BusinessException,
      );
    });
  });
});

