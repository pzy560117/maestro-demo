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
   * 查询所有应用
   * GET /apps
   */
  @Get()
  @ApiOperation({ summary: '查询所有应用' })
  @ApiOkResponse({
    description: '应用列表',
    type: [AppResponseDto],
  })
  async findAll(): Promise<BaseResponseDto<AppResponseDto[]>> {
    const apps = await this.appsService.findAll();
    return BaseResponseDto.success(apps);
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
   * 查询应用的所有版本（嵌套路由）
   * GET /apps/:id/versions
   */
  @Get(':id/versions')
  @ApiOperation({ summary: '查询应用的所有版本' })
  @ApiParam({ name: 'id', description: '应用ID' })
  @ApiOkResponse({
    description: '版本列表',
    type: [AppVersionResponseDto],
  })
  async findVersions(@Param('id') appId: string): Promise<BaseResponseDto<AppVersionResponseDto[]>> {
    const versions = await this.appVersionsService.findByAppId(appId);
    return BaseResponseDto.success(versions);
  }
}

