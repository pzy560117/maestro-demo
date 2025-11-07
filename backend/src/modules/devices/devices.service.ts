import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { AdbService } from './services/adb.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { DeviceStatus } from '@prisma/client';

/**
 * 设备管理服务
 * 实现功能A：应用与设备注册
 */
@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adbService: AdbService,
  ) {}

  /**
   * 创建设备
   * 验收标准：
   * 1. 录入重复设备序列号时提示"设备已存在"，记录未更新
   * 2. 录入新设备、ADB校验通过后，devices表存在记录且状态为AVAILABLE
   * 4. 设备状态离线时，系统自动标记为OFFLINE
   */
  async create(createDeviceDto: CreateDeviceDto): Promise<DeviceResponseDto> {
    const { serialNumber } = createDeviceDto;

    // 检查设备是否已存在
    const existingDevice = await this.prisma.device.findUnique({
      where: { serial: serialNumber },
    });

    if (existingDevice) {
      throw BusinessException.alreadyExists('设备', serialNumber);
    }

    // 校验设备是否在线（ADB验证）
    const isOnline = await this.adbService.isDeviceOnline(serialNumber);

    if (!isOnline) {
      this.logger.warn(`Device ${serialNumber} is offline, marking as OFFLINE`);
    }

    // 如果在线，尝试获取分辨率（若未提供）
    let resolution = createDeviceDto.resolution;
    if (!resolution && isOnline) {
      resolution = (await this.adbService.getDeviceResolution(serialNumber)) || undefined;
    }

    // 字段映射：DTO -> Prisma
    // 将androidVersion转换为"Android X"格式
    const osVersion = createDeviceDto.androidVersion.startsWith('Android ')
      ? createDeviceDto.androidVersion
      : `Android ${createDeviceDto.androidVersion}`;

    // 将tags数组转换为JSON对象
    const tagsJson = createDeviceDto.tags
      ? createDeviceDto.tags.reduce((acc, tag, index) => ({ ...acc, [`tag${index}`]: tag }), {})
      : {};

    // 创建设备记录
    const device = await this.prisma.device.create({
      data: {
        serial: serialNumber,
        model: createDeviceDto.model,
        osVersion,
        deviceType: createDeviceDto.type,
        resolution,
        tags: tagsJson as any,
        status: isOnline ? DeviceStatus.AVAILABLE : DeviceStatus.OFFLINE,
        lastHeartbeatAt: isOnline ? new Date() : null,
      },
    });

    this.logger.log(`Device created: ${serialNumber}, status: ${device.status}`);

    return new DeviceResponseDto(device);
  }

  /**
   * 查询所有设备（支持分页）
   */
  async findAll(params?: { page?: number; limit?: number }): Promise<{
    items: DeviceResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.device.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: devices.map((device) => new DeviceResponseDto(device)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 根据ID查询设备
   */
  async findOne(id: string): Promise<DeviceResponseDto> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw BusinessException.notFound('设备', id);
    }

    return new DeviceResponseDto(device);
  }

  /**
   * 根据序列号查询设备
   */
  async findBySerial(serial: string): Promise<DeviceResponseDto> {
    const device = await this.prisma.device.findUnique({
      where: { serial },
    });

    if (!device) {
      throw BusinessException.notFound('设备', serial);
    }

    return new DeviceResponseDto(device);
  }

  /**
   * 更新设备信息
   */
  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<DeviceResponseDto> {
    // 检查设备是否存在
    const existingDevice = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!existingDevice) {
      throw BusinessException.notFound('设备', id);
    }

    // 如果更新序列号，检查新序列号是否重复
    if (updateDeviceDto.serialNumber && updateDeviceDto.serialNumber !== existingDevice.serial) {
      const duplicateDevice = await this.prisma.device.findUnique({
        where: { serial: updateDeviceDto.serialNumber },
      });

      if (duplicateDevice) {
        throw BusinessException.alreadyExists('设备', updateDeviceDto.serialNumber);
      }
    }

    // 字段映射：DTO -> Prisma
    const updateData: any = {};

    if (updateDeviceDto.serialNumber !== undefined) {
      updateData.serial = updateDeviceDto.serialNumber;
    }
    if (updateDeviceDto.model !== undefined) {
      updateData.model = updateDeviceDto.model;
    }
    if (updateDeviceDto.androidVersion !== undefined) {
      // 将androidVersion转换为"Android X"格式
      updateData.osVersion = updateDeviceDto.androidVersion.startsWith('Android ')
        ? updateDeviceDto.androidVersion
        : `Android ${updateDeviceDto.androidVersion}`;
    }
    if (updateDeviceDto.type !== undefined) {
      updateData.deviceType = updateDeviceDto.type;
    }
    if (updateDeviceDto.resolution !== undefined) {
      updateData.resolution = updateDeviceDto.resolution;
    }
    if (updateDeviceDto.status !== undefined) {
      updateData.status = updateDeviceDto.status;
    }
    if (updateDeviceDto.tags !== undefined) {
      // 将tags数组转换为JSON对象
      updateData.tags = updateDeviceDto.tags
        ? updateDeviceDto.tags.reduce((acc, tag, index) => ({ ...acc, [`tag${index}`]: tag }), {})
        : {};
    }

    const device = await this.prisma.device.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Device updated: ${device.serial}`);

    return new DeviceResponseDto(device);
  }

  /**
   * 删除设备
   */
  async remove(id: string): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw BusinessException.notFound('设备', id);
    }

    await this.prisma.device.delete({
      where: { id },
    });

    this.logger.log(`Device deleted: ${device.serial}`);
  }

  /**
   * 更新设备心跳状态
   * 定期调用以维护设备在线状态
   */
  async updateHeartbeat(id: string): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw BusinessException.notFound('设备', id);
    }

    // 检查设备是否在线
    const isOnline = await this.adbService.isDeviceOnline(device.serial);

    await this.prisma.device.update({
      where: { id },
      data: {
        status: isOnline ? DeviceStatus.AVAILABLE : DeviceStatus.OFFLINE,
        lastHeartbeatAt: isOnline ? new Date() : device.lastHeartbeatAt,
      },
    });

    this.logger.debug(`Device ${device.serial} heartbeat updated, online: ${isOnline}`);
  }

  /**
   * 获取可用设备列表
   * 用于任务分配
   */
  async getAvailableDevices(): Promise<DeviceResponseDto[]> {
    const devices = await this.prisma.device.findMany({
      where: { status: DeviceStatus.AVAILABLE },
      orderBy: { lastHeartbeatAt: 'desc' },
    });

    return devices.map((device) => new DeviceResponseDto(device));
  }

  /**
   * 扫描连接的设备
   * 调用 ADB 获取所有连接设备的详细信息
   */
  async scanDevices(): Promise<
    Array<{
      serialNumber: string;
      model: string;
      androidVersion: string;
      resolution: string | null;
      type: string;
      status: string;
      manufacturer: string | null;
      isExisting: boolean;
    }>
  > {
    this.logger.log('Scanning connected devices...');

    // 获取连接的设备信息
    const connectedDevices = await this.adbService.getConnectedDevicesInfo();

    // 检查哪些设备已存在于数据库
    const deviceInfos = await Promise.all(
      connectedDevices.map(async (device) => {
        const existing = await this.prisma.device.findUnique({
          where: { serial: device.serial },
        });

        return {
          serialNumber: device.serial,
          model: device.model,
          androidVersion: device.androidVersion,
          resolution: device.resolution,
          type: device.deviceType,
          status: device.status,
          manufacturer: device.manufacturer,
          isExisting: !!existing,
        };
      }),
    );

    this.logger.log(
      `Scanned ${deviceInfos.length} devices, ${deviceInfos.filter((d) => !d.isExisting).length} are new`,
    );

    return deviceInfos;
  }

  /**
   * 批量创建设备
   * @param devices 设备列表
   * @returns 创建结果
   */
  async batchCreate(devices: CreateDeviceDto[]): Promise<{
    success: Array<{ id: string; serialNumber: string; message: string }>;
    failed: Array<{ serialNumber: string; error: string; code: string }>;
    total: number;
    successCount: number;
    failedCount: number;
  }> {
    const success: Array<{ id: string; serialNumber: string; message: string }> = [];
    const failed: Array<{ serialNumber: string; error: string; code: string }> = [];

    for (const deviceDto of devices) {
      try {
        // 检查设备是否已存在
        const existing = await this.prisma.device.findUnique({
          where: { serial: deviceDto.serialNumber },
        });

        if (existing) {
          failed.push({
            serialNumber: deviceDto.serialNumber,
            error: '设备已存在',
            code: 'DEVICE_EXISTS',
          });
          continue;
        }

        // 创建设备
        const device = await this.create(deviceDto);
        success.push({
          id: device.id,
          serialNumber: device.serialNumber,
          message: '添加成功',
        });
      } catch (error) {
        this.logger.error(`Failed to create device ${deviceDto.serialNumber}`, error);
        const errorMessage = error instanceof Error ? error.message : '创建失败';
        failed.push({
          serialNumber: deviceDto.serialNumber,
          error: errorMessage,
          code: 'CREATE_FAILED',
        });
      }
    }

    this.logger.log(`Batch create completed: ${success.length} success, ${failed.length} failed`);

    return {
      success,
      failed,
      total: devices.length,
      successCount: success.length,
      failedCount: failed.length,
    };
  }
}
