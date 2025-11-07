import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { BaseResponseDto } from '../common/dto/base-response.dto';

/**
 * 设备管理控制器
 * 遵循REST API规范
 */
@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * 创建设备
   * POST /devices
   */
  @Post()
  @ApiOperation({ summary: '创建设备', description: '注册新设备到系统，自动执行ADB验证' })
  @ApiCreatedResponse({
    description: '设备创建成功',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '设备已存在',
  })
  async create(
    @Body() createDeviceDto: CreateDeviceDto,
  ): Promise<BaseResponseDto<DeviceResponseDto>> {
    const device = await this.devicesService.create(createDeviceDto);
    return BaseResponseDto.success(device, '设备注册成功');
  }

  /**
   * 查询所有设备（支持分页）
   * GET /devices
   */
  @Get()
  @ApiOperation({ summary: '查询所有设备' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 20 })
  @ApiOkResponse({
    description: '设备列表（分页）',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/DeviceResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<
    BaseResponseDto<{
      items: DeviceResponseDto[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    const result = await this.devicesService.findAll({ page, limit });
    return BaseResponseDto.success(result);
  }

  /**
   * 扫描连接的设备
   * GET /devices/scan
   * 注意：必须在 :id 路由之前，避免 scan 被当作 id 参数
   */
  @Get('scan')
  @ApiOperation({ summary: '扫描连接的设备', description: '扫描当前通过ADB连接的所有设备' })
  @ApiOkResponse({
    description: '扫描到的设备列表',
    schema: {
      type: 'object',
      properties: {
        devices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              serialNumber: { type: 'string' },
              model: { type: 'string' },
              androidVersion: { type: 'string' },
              resolution: { type: 'string', nullable: true },
              type: { type: 'string', enum: ['REAL', 'EMULATOR'] },
              status: { type: 'string' },
              manufacturer: { type: 'string', nullable: true },
              isExisting: { type: 'boolean' },
            },
          },
        },
        total: { type: 'number' },
        scannedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async scanDevices(): Promise<
    BaseResponseDto<{
      devices: any[];
      total: number;
      scannedAt: string;
    }>
  > {
    const devices = await this.devicesService.scanDevices();
    const message =
      devices.length > 0
        ? `扫描成功，检测到 ${devices.length} 台设备`
        : '扫描完成，未检测到连接的设备';

    return BaseResponseDto.success(
      {
        devices,
        total: devices.length,
        scannedAt: new Date().toISOString(),
      },
      message,
    );
  }

  /**
   * 批量添加设备
   * POST /devices/batch
   * 注意：必须在 :id 路由之前
   */
  @Post('batch')
  @ApiOperation({ summary: '批量添加设备', description: '批量添加扫描到的设备' })
  @ApiCreatedResponse({
    description: '批量添加结果',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              serialNumber: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              serialNumber: { type: 'string' },
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
        total: { type: 'number' },
        successCount: { type: 'number' },
        failedCount: { type: 'number' },
      },
    },
  })
  async batchCreate(@Body() body: { devices: CreateDeviceDto[] }): Promise<BaseResponseDto<any>> {
    const result = await this.devicesService.batchCreate(body.devices);
    return BaseResponseDto.success(result, '批量添加完成');
  }

  /**
   * 获取可用设备列表
   * GET /devices/available/list
   * 注意：必须在 :id 路由之前
   */
  @Get('available/list')
  @ApiOperation({ summary: '获取可用设备列表', description: '返回状态为AVAILABLE的设备' })
  @ApiOkResponse({
    description: '可用设备列表',
    type: [DeviceResponseDto],
  })
  async getAvailableDevices(): Promise<BaseResponseDto<DeviceResponseDto[]>> {
    const devices = await this.devicesService.getAvailableDevices();
    return BaseResponseDto.success(devices);
  }

  /**
   * 根据ID查询设备
   * GET /devices/:id
   */
  @Get(':id')
  @ApiOperation({ summary: '根据ID查询设备' })
  @ApiParam({ name: 'id', description: '设备ID' })
  @ApiOkResponse({
    description: '设备详情',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '设备不存在',
  })
  async findOne(@Param('id') id: string): Promise<BaseResponseDto<DeviceResponseDto>> {
    const device = await this.devicesService.findOne(id);
    return BaseResponseDto.success(device);
  }

  /**
   * 更新设备信息
   * PATCH /devices/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: '更新设备信息' })
  @ApiParam({ name: 'id', description: '设备ID' })
  @ApiOkResponse({
    description: '设备更新成功',
    type: DeviceResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ): Promise<BaseResponseDto<DeviceResponseDto>> {
    const device = await this.devicesService.update(id, updateDeviceDto);
    return BaseResponseDto.success(device, '设备更新成功');
  }

  /**
   * 删除设备
   * DELETE /devices/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除设备' })
  @ApiParam({ name: 'id', description: '设备ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '设备删除成功',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.devicesService.remove(id);
  }

  /**
   * 更新设备心跳
   * POST /devices/:id/heartbeat
   */
  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新设备心跳', description: '检查设备在线状态并更新心跳时间' })
  @ApiParam({ name: 'id', description: '设备ID' })
  @ApiOkResponse({ description: '心跳更新成功' })
  async updateHeartbeat(@Param('id') id: string): Promise<BaseResponseDto<void>> {
    await this.devicesService.updateHeartbeat(id);
    return BaseResponseDto.success(undefined, '心跳更新成功');
  }
}
