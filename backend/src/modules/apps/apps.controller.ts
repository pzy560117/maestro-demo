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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AppsService } from './apps.service';
import { AppVersionsService } from './app-versions.service';
import { CreateAppDto } from './dto/create-app.dto';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { AppResponseDto, AppVersionResponseDto } from './dto/app-response.dto';
import { BaseResponseDto } from '../common/dto/base-response.dto';

/**
 * 应用管理控制器
 */
@ApiTags('apps')
@Controller('apps')
export class AppsController {
  constructor(
    private readonly appsService: AppsService,
    private readonly appVersionsService: AppVersionsService,
  ) {}

  /**
   * 创建应用
   * POST /apps
   */
  @Post()
  @ApiOperation({ summary: '创建应用', description: '注册新应用到系统' })
  @ApiCreatedResponse({
    description: '应用创建成功',
    type: AppResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '应用已存在',
  })
  async create(@Body() createAppDto: CreateAppDto): Promise<BaseResponseDto<AppResponseDto>> {
    const app = await this.appsService.create(createAppDto);
    return BaseResponseDto.success(app, '应用创建成功');
  }

  /**
   * 查询所有应用（支持分页）
   * GET /apps
   */
  @Get()
  @ApiOperation({ summary: '查询所有应用' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 20 })
  @ApiOkResponse({
    description: '应用列表（分页）',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/AppResponseDto' } },
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
  ): Promise<BaseResponseDto<{
    items: AppResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>> {
    const result = await this.appsService.findAll({ page, limit });
    return BaseResponseDto.success(result);
  }

  /**
   * 扫描设备上的应用
   * GET /apps/scan
   * 注意：必须在 :id 路由之前，避免 scan 被当作 id 参数
   */
  @Get('scan')
  @ApiOperation({ summary: '扫描设备上的应用', description: '扫描连接设备上已安装的第三方应用（排除系统应用）' })
  @ApiQuery({ name: 'deviceId', required: false, description: '设备ID（可选，不提供则使用第一个在线设备）' })
  @ApiOkResponse({
    description: '扫描到的应用列表',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          packageName: { type: 'string', description: '应用包名' },
          appName: { type: 'string', description: '应用名称' },
          versionName: { type: 'string', description: '版本名称' },
          versionCode: { type: 'number', description: '版本号' },
          isExisting: { type: 'boolean', description: '是否已存在于数据库中' },
        },
      },
    },
  })
  async scanApps(@Query('deviceId') deviceId?: string): Promise<BaseResponseDto<Array<{
    packageName: string;
    appName: string;
    versionName: string;
    versionCode: number;
    isExisting: boolean;
  }>>> {
    const apps = await this.appsService.scanApps(deviceId);
    const message = apps.length > 0 
      ? `扫描完成，找到 ${apps.length} 个应用` 
      : '未找到已安装的第三方应用';
    return BaseResponseDto.success(apps, message);
  }

  /**
   * 批量添加应用
   * POST /apps/batch
   * 注意：必须在 :id 路由之前
   */
  @Post('batch')
  @ApiOperation({ summary: '批量添加应用', description: '批量创建多个应用' })
  @ApiCreatedResponse({
    description: '批量创建结果',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              packageName: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              packageName: { type: 'string' },
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
  async batchCreate(@Body() apps: CreateAppDto[]): Promise<BaseResponseDto<{
    success: Array<{ id: string; packageName: string; message: string }>;
    failed: Array<{ packageName: string; error: string; code: string }>;
    total: number;
    successCount: number;
    failedCount: number;
  }>> {
    const result = await this.appsService.batchCreate(apps);
    const message = `批量创建完成：成功 ${result.successCount} 个，失败 ${result.failedCount} 个`;
    return BaseResponseDto.success(result, message);
  }

  /**
   * 根据ID查询应用
   * GET /apps/:id
   */
  @Get(':id')
  @ApiOperation({ summary: '根据ID查询应用' })
  @ApiParam({ name: 'id', description: '应用ID' })
  @ApiOkResponse({
    description: '应用详情',
    type: AppResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<BaseResponseDto<AppResponseDto>> {
    const app = await this.appsService.findOne(id);
    return BaseResponseDto.success(app);
  }

  /**
   * 更新应用
   * PATCH /apps/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: '更新应用信息' })
  @ApiParam({ name: 'id', description: '应用ID' })
  @ApiOkResponse({
    description: '应用更新成功',
    type: AppResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateAppDto: Partial<CreateAppDto>,
  ): Promise<BaseResponseDto<AppResponseDto>> {
    const app = await this.appsService.update(id, updateAppDto);
    return BaseResponseDto.success(app, '应用更新成功');
  }

  /**
   * 删除应用
   * DELETE /apps/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除应用' })
  @ApiParam({ name: 'id', description: '应用ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '应用删除成功',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.appsService.remove(id);
  }

  /**
   * 创建应用版本（嵌套路由）
   * POST /apps/:id/versions
   */
  @Post(':id/versions')
  @ApiOperation({ summary: '创建应用版本', description: '为指定应用创建新版本' })
  @ApiParam({ name: 'id', description: '应用ID' })
  @ApiCreatedResponse({
    description: '版本创建成功',
    type: AppVersionResponseDto,
  })
  async createVersion(
    @Param('id') appId: string,
    @Body() createVersionDto: Omit<CreateAppVersionDto, 'appId'>,
  ): Promise<BaseResponseDto<AppVersionResponseDto>> {
    // 合并路径参数和请求体
    const versionData: CreateAppVersionDto = {
      appId,
      ...createVersionDto,
    };
    const version = await this.appVersionsService.create(versionData);
    return BaseResponseDto.success(version, '应用版本创建成功');
  }

  /**
   * 查询应用的所有版本（嵌套路由，支持分页）
   * GET /apps/:id/versions
   */
  @Get(':id/versions')
  @ApiOperation({ summary: '查询应用的所有版本' })
  @ApiParam({ name: 'id', description: '应用ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 20 })
  @ApiOkResponse({
    description: '版本列表（分页）',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/AppVersionResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findVersions(
    @Param('id') appId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<BaseResponseDto<{
    items: AppVersionResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>> {
    const result = await this.appVersionsService.findByAppId(appId, { page, limit });
    return BaseResponseDto.success(result);
  }
}

