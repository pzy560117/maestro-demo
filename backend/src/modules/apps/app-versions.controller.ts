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
import { AppVersionsService } from './app-versions.service';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { AppVersionResponseDto } from './dto/app-response.dto';
import { BaseResponseDto } from '../common/dto/base-response.dto';

/**
 * 应用版本管理控制器
 */
@ApiTags('apps')
@Controller('app-versions')
export class AppVersionsController {
  constructor(private readonly appVersionsService: AppVersionsService) {}

  /**
   * 创建应用版本
   * POST /app-versions
   */
  @Post()
  @ApiOperation({ summary: '创建应用版本', description: '为指定应用创建新版本' })
  @ApiCreatedResponse({
    description: '版本创建成功',
    type: AppVersionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '版本已存在',
  })
  async create(
    @Body() createVersionDto: CreateAppVersionDto,
  ): Promise<BaseResponseDto<AppVersionResponseDto>> {
    const version = await this.appVersionsService.create(createVersionDto);
    return BaseResponseDto.success(version, '应用版本创建成功');
  }

  /**
   * 查询应用版本列表
   * GET /app-versions?appId=xxx
   */
  @Get()
  @ApiOperation({ summary: '查询应用版本列表' })
  @ApiQuery({
    name: 'appId',
    required: false,
    description: '应用ID，若提供则仅返回该应用的版本',
  })
  @ApiOkResponse({
    description: '版本列表',
    type: [AppVersionResponseDto],
  })
  async findAll(
    @Query('appId') appId?: string,
  ): Promise<BaseResponseDto<AppVersionResponseDto[]>> {
    const versions = appId
      ? await this.appVersionsService.findByAppId(appId)
      : await this.appVersionsService.findAll();

    return BaseResponseDto.success(versions);
  }

  /**
   * 根据ID查询版本
   * GET /app-versions/:id
   */
  @Get(':id')
  @ApiOperation({ summary: '根据ID查询应用版本' })
  @ApiParam({ name: 'id', description: '版本ID' })
  @ApiOkResponse({
    description: '版本详情',
    type: AppVersionResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<BaseResponseDto<AppVersionResponseDto>> {
    const version = await this.appVersionsService.findOne(id);
    return BaseResponseDto.success(version);
  }

  /**
   * 更新应用版本
   * PATCH /app-versions/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: '更新应用版本信息' })
  @ApiParam({ name: 'id', description: '版本ID' })
  @ApiOkResponse({
    description: '版本更新成功',
    type: AppVersionResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateVersionDto: Partial<CreateAppVersionDto>,
  ): Promise<BaseResponseDto<AppVersionResponseDto>> {
    const version = await this.appVersionsService.update(id, updateVersionDto);
    return BaseResponseDto.success(version, '应用版本更新成功');
  }

  /**
   * 删除应用版本
   * DELETE /app-versions/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除应用版本' })
  @ApiParam({ name: 'id', description: '版本ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '版本删除成功',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.appVersionsService.remove(id);
  }
}

