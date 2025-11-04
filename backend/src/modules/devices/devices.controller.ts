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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
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
   * 查询所有设备
   * GET /devices
   */
  @Get()
  @ApiOperation({ summary: '查询所有设备' })
  @ApiOkResponse({
    description: '设备列表',
    type: [DeviceResponseDto],
  })
  async findAll(): Promise<BaseResponseDto<DeviceResponseDto[]>> {
    const devices = await this.devicesService.findAll();
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

  /**
   * 获取可用设备列表
   * GET /devices/available/list
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
}

