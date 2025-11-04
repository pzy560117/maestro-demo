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
    const { serial } = createDeviceDto;

    // 检查设备是否已存在
    const existingDevice = await this.prisma.device.findUnique({
      where: { serial },
    });

    if (existingDevice) {
      throw BusinessException.alreadyExists('设备', serial);
    }

    // 校验设备是否在线（ADB验证）
    const isOnline = await this.adbService.isDeviceOnline(serial);
    
    if (!isOnline) {
      this.logger.warn(`Device ${serial} is offline, marking as OFFLINE`);
    }

    // 如果在线，尝试获取分辨率（若未提供）
    let resolution = createDeviceDto.resolution;
    if (!resolution && isOnline) {
      resolution = (await this.adbService.getDeviceResolution(serial)) || undefined;
    }

    // 创建设备记录
    const device = await this.prisma.device.create({
      data: {
        serial: createDeviceDto.serial,
        model: createDeviceDto.model,
        osVersion: createDeviceDto.osVersion,
        deviceType: createDeviceDto.deviceType,
        resolution,
        tags: (createDeviceDto.tags || {}) as any,
        status: isOnline ? DeviceStatus.AVAILABLE : DeviceStatus.OFFLINE,
        lastHeartbeatAt: isOnline ? new Date() : null,
      },
    });

    this.logger.log(`Device created: ${serial}, status: ${device.status}`);

    return new DeviceResponseDto(device);
  }

  /**
   * 查询所有设备
   */
  async findAll(): Promise<DeviceResponseDto[]> {
    const devices = await this.prisma.device.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return devices.map((device) => new DeviceResponseDto(device));
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
    if (updateDeviceDto.serial && updateDeviceDto.serial !== existingDevice.serial) {
      const duplicateDevice = await this.prisma.device.findUnique({
        where: { serial: updateDeviceDto.serial },
      });

      if (duplicateDevice) {
        throw BusinessException.alreadyExists('设备', updateDeviceDto.serial);
      }
    }

    const device = await this.prisma.device.update({
      where: { id },
      data: {
        ...updateDeviceDto,
        tags: updateDeviceDto.tags !== undefined ? (updateDeviceDto.tags as any) : undefined,
      },
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
}

