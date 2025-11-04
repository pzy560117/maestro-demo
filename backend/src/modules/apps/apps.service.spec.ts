import { Test, TestingModule } from '@nestjs/testing';
import { AppsService } from './apps.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';

/**
 * 应用服务单元测试
 */
describe('AppsService', () => {
  let service: AppsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    app: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AppsService>(AppsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createAppDto = {
      name: '测试应用',
      packageName: 'com.test.app',
      description: '测试应用说明',
    };

    it('应该成功创建应用', async () => {
      mockPrismaService.app.findUnique.mockResolvedValue(null);
      mockPrismaService.app.create.mockResolvedValue({
        id: 'app-id',
        ...createAppDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createAppDto);

      expect(result.name).toBe(createAppDto.name);
      expect(result.packageName).toBe(createAppDto.packageName);
    });

    it('应该拒绝重复的包名', async () => {
      mockPrismaService.app.findUnique.mockResolvedValueOnce({
        id: 'existing-id',
        packageName: createAppDto.packageName,
      });

      await expect(service.create(createAppDto)).rejects.toThrow(BusinessException);
    });

    it('应该拒绝重复的应用名称', async () => {
      mockPrismaService.app.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'existing-id',
          name: createAppDto.name,
        });

      await expect(service.create(createAppDto)).rejects.toThrow(BusinessException);
    });
  });

  describe('findAll', () => {
    it('应该返回应用列表', async () => {
      const apps = [
        { id: '1', name: 'App1', packageName: 'com.app1' },
        { id: '2', name: 'App2', packageName: 'com.app2' },
      ];

      mockPrismaService.app.findMany.mockResolvedValue(apps);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.app.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('应该返回应用详情', async () => {
      const app = {
        id: 'app-id',
        name: '测试应用',
        packageName: 'com.test.app',
      };

      mockPrismaService.app.findUnique.mockResolvedValue(app);

      const result = await service.findOne('app-id');

      expect(result.id).toBe('app-id');
    });

    it('应该抛出404错误（应用不存在）', async () => {
      mockPrismaService.app.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(BusinessException);
    });
  });

  describe('update', () => {
    it('应该成功更新应用', async () => {
      const existingApp = {
        id: 'app-id',
        name: '旧名称',
        packageName: 'com.test.app',
      };

      const updateData = {
        description: '新的应用说明',
      };

      mockPrismaService.app.findUnique.mockResolvedValue(existingApp);
      mockPrismaService.app.update.mockResolvedValue({
        ...existingApp,
        ...updateData,
      });

      const result = await service.update('app-id', updateData);

      expect(result.description).toBe('新的应用说明');
    });

    it('应该拒绝更新为重复的包名', async () => {
      mockPrismaService.app.findUnique
        .mockResolvedValueOnce({ id: 'app-id', packageName: 'com.old.app' })
        .mockResolvedValueOnce({ id: 'other-id', packageName: 'com.new.app' });

      await expect(
        service.update('app-id', { packageName: 'com.new.app' }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('remove', () => {
    it('应该成功删除应用', async () => {
      const app = {
        id: 'app-id',
        name: '测试应用',
      };

      mockPrismaService.app.findUnique.mockResolvedValue(app);
      mockPrismaService.app.delete.mockResolvedValue(app);

      await service.remove('app-id');

      expect(mockPrismaService.app.delete).toHaveBeenCalledWith({
        where: { id: 'app-id' },
      });
    });

    it('应该抛出404错误（应用不存在）', async () => {
      mockPrismaService.app.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(BusinessException);
    });
  });
});

