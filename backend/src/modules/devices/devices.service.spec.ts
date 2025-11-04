import { Test, TestingModule } from '@nestjs/testing';
import { DevicesService } from './devices.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AdbService } from './services/adb.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { DeviceType, DeviceStatus } from '@prisma/client';

/**
 * 设备服务单元测试
 */
describe('DevicesService', () => {
  let service: DevicesService;
  let prisma: PrismaService;
  let adbService: AdbService;

  const mockPrismaService = {
    device: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAdbService = {
    isDeviceOnline: jest.fn(),
    getDeviceResolution: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AdbService,
          useValue: mockAdbService,
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    prisma = module.get<PrismaService>(PrismaService);
    adbService = module.get<AdbService>(AdbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDeviceDto = {
      serial: 'emulator-5554',
      model: 'Pixel 6',
      osVersion: 'Android 13',
      deviceType: DeviceType.EMULATOR,
      resolution: '1080x1920',
    };

    it('应该成功创建设备（ADB在线）', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(null);
      mockAdbService.isDeviceOnline.mockResolvedValue(true);
      mockPrismaService.device.create.mockResolvedValue({
        id: 'device-id',
        ...createDeviceDto,
        status: DeviceStatus.AVAILABLE,
        lastHeartbeatAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.create(createDeviceDto);

      expect(result.serial).toBe(createDeviceDto.serial);
      expect(result.status).toBe(DeviceStatus.AVAILABLE);
      expect(mockAdbService.isDeviceOnline).toHaveBeenCalledWith(createDeviceDto.serial);
    });

    it('应该创建设备但标记为OFFLINE（ADB离线）', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(null);
      mockAdbService.isDeviceOnline.mockResolvedValue(false);
      mockPrismaService.device.create.mockResolvedValue({
        id: 'device-id',
        ...createDeviceDto,
        status: DeviceStatus.OFFLINE,
        lastHeartbeatAt: null,
        createdAt: new Date(),
      });

      const result = await service.create(createDeviceDto);

      expect(result.status).toBe(DeviceStatus.OFFLINE);
      expect(result.lastHeartbeatAt).toBeNull();
    });

    it('应该拒绝重复的设备序列号', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue({
        id: 'existing-id',
        serial: createDeviceDto.serial,
      });

      await expect(service.create(createDeviceDto)).rejects.toThrow(BusinessException);
    });

    it('应该自动获取分辨率（未提供时）', async () => {
      const { resolution, ...dtoWithoutResolution } = createDeviceDto;

      mockPrismaService.device.findUnique.mockResolvedValue(null);
      mockAdbService.isDeviceOnline.mockResolvedValue(true);
      mockAdbService.getDeviceResolution.mockResolvedValue('1920x1080');
      mockPrismaService.device.create.mockResolvedValue({
        id: 'device-id',
        ...dtoWithoutResolution,
        resolution: '1920x1080',
        status: DeviceStatus.AVAILABLE,
        lastHeartbeatAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.create(dtoWithoutResolution);

      expect(mockAdbService.getDeviceResolution).toHaveBeenCalledWith(createDeviceDto.serial);
      expect(result.resolution).toBe('1920x1080');
    });
  });

  describe('findAll', () => {
    it('应该返回设备列表', async () => {
      const devices = [
        { id: '1', serial: 'device-1', status: DeviceStatus.AVAILABLE },
        { id: '2', serial: 'device-2', status: DeviceStatus.BUSY },
      ];

      mockPrismaService.device.findMany.mockResolvedValue(devices);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.device.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('应该返回设备详情', async () => {
      const device = {
        id: 'device-id',
        serial: 'emulator-5554',
        status: DeviceStatus.AVAILABLE,
      };

      mockPrismaService.device.findUnique.mockResolvedValue(device);

      const result = await service.findOne('device-id');

      expect(result.id).toBe('device-id');
    });

    it('应该抛出404错误（设备不存在）', async () => {
      mockPrismaService.device.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(BusinessException);
    });
  });

  describe('update', () => {
    it('应该成功更新设备', async () => {
      const existingDevice = {
        id: 'device-id',
        serial: 'emulator-5554',
      };

      const updateData = {
        status: DeviceStatus.OFFLINE,
      };

      mockPrismaService.device.findUnique.mockResolvedValue(existingDevice);
      mockPrismaService.device.update.mockResolvedValue({
        ...existingDevice,
        ...updateData,
      });

      const result = await service.update('device-id', updateData);

      expect(result.status).toBe(DeviceStatus.OFFLINE);
    });

    it('应该拒绝更新为重复的序列号', async () => {
      mockPrismaService.device.findUnique
        .mockResolvedValueOnce({ id: 'device-id', serial: 'old-serial' })
        .mockResolvedValueOnce({ id: 'other-id', serial: 'new-serial' });

      await expect(
        service.update('device-id', { serial: 'new-serial' }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getAvailableDevices', () => {
    it('应该只返回可用设备', async () => {
      const availableDevices = [
        { id: '1', serial: 'device-1', status: DeviceStatus.AVAILABLE },
        { id: '2', serial: 'device-2', status: DeviceStatus.AVAILABLE },
      ];

      mockPrismaService.device.findMany.mockResolvedValue(availableDevices);

      const result = await service.getAvailableDevices();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.device.findMany).toHaveBeenCalledWith({
        where: { status: DeviceStatus.AVAILABLE },
        orderBy: { lastHeartbeatAt: 'desc' },
      });
    });
  });
});

