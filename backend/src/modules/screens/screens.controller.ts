import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ScreensService } from './screens.service';
import { ScreenDiffService } from './services/screen-diff.service';
import { CreateScreenDto } from './dto/create-screen.dto';
import { ScreenResponseDto, ElementResponseDto } from './dto/screen-response.dto';

/**
 * Multer 文件类型定义
 */
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  path?: string;
}

/**
 * 界面管理控制器
 */
@ApiTags('Screens - 界面管理')
@Controller('screens')
export class ScreensController {
  constructor(
    private readonly screensService: ScreensService,
    private readonly screenDiffService: ScreenDiffService,
  ) {}

  /**
   * 创建界面记录
   */
  @Post()
  @ApiOperation({ summary: '创建界面记录', description: '保存界面截图、DOM 和元素信息' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '界面数据（包含截图文件和 JSON 元数据）',
    schema: {
      type: 'object',
      properties: {
        screenshot: { type: 'string', format: 'binary', description: '截图文件' },
        data: { type: 'string', description: '界面元数据（JSON）' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: '界面创建成功', type: ScreenResponseDto })
  @UseInterceptors(FileInterceptor('screenshot'))
  async create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })], // 5MB
      }),
    )
    screenshot: MulterFile,
    @Body('data') data: string,
  ): Promise<ScreenResponseDto> {
    // 解析 JSON 数据
    const createScreenDto: CreateScreenDto = JSON.parse(data);

    // 模拟 DOM 数据（实际应从请求中获取）
    const domData = {
      hierarchy: [],
      timestamp: new Date().toISOString(),
    };

    return await this.screensService.create(createScreenDto, screenshot.buffer, domData);
  }

  /**
   * 根据 ID 查询界面
   */
  @Get(':id')
  @ApiOperation({ summary: '查询界面详情' })
  @ApiParam({ name: 'id', description: '界面 ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '查询成功', type: ScreenResponseDto })
  async findOne(@Param('id') id: string): Promise<ScreenResponseDto> {
    return await this.screensService.findOne(id);
  }

  /**
   * 查询应用版本的所有界面
   */
  @Get('app-version/:appVersionId')
  @ApiOperation({ summary: '查询应用版本的所有界面' })
  @ApiParam({ name: 'appVersionId', description: '应用版本 ID' })
  @ApiQuery({ name: 'skip', required: false, description: '跳过数量', example: 0 })
  @ApiQuery({ name: 'take', required: false, description: '获取数量', example: 20 })
  @ApiResponse({ status: HttpStatus.OK, description: '查询成功' })
  async findByAppVersion(
    @Param('appVersionId') appVersionId: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ): Promise<{ screens: ScreenResponseDto[]; total: number }> {
    return await this.screensService.findByAppVersion(appVersionId, {
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  /**
   * 查询界面的所有元素
   */
  @Get(':id/elements')
  @ApiOperation({ summary: '查询界面的所有元素' })
  @ApiParam({ name: 'id', description: '界面 ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '查询成功', type: [ElementResponseDto] })
  async findElements(@Param('id') id: string): Promise<ElementResponseDto[]> {
    return await this.screensService.findElements(id);
  }

  /**
   * 获取界面 DOM
   */
  @Get(':id/dom')
  @ApiOperation({ summary: '获取界面 DOM 数据' })
  @ApiParam({ name: 'id', description: '界面 ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '查询成功' })
  async getDom(@Param('id') id: string): Promise<any> {
    return await this.screensService.getDom(id);
  }

  /**
   * 删除界面
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除界面' })
  @ApiParam({ name: 'id', description: '界面 ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: '删除成功' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.screensService.remove(id);
  }

  /**
   * 对比两个界面并生成差异报告
   * Iteration 3: 功能 H - 界面差异分析
   */
  @Post('compare')
  @ApiOperation({
    summary: '对比两个界面',
    description: '生成界面差异报告，包含元素新增/删除/修改分析',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        baseScreenId: { type: 'string', format: 'uuid', description: '基线界面ID' },
        targetScreenId: { type: 'string', format: 'uuid', description: '目标界面ID' },
      },
      required: ['baseScreenId', 'targetScreenId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '差异分析完成',
  })
  async compareScreens(
    @Body('baseScreenId', ParseUUIDPipe) baseScreenId: string,
    @Body('targetScreenId', ParseUUIDPipe) targetScreenId: string,
  ) {
    const diff = await this.screenDiffService.compareScreens(
      baseScreenId,
      targetScreenId,
    );
    return {
      code: 0,
      message: '界面差异分析完成',
      data: diff,
      traceId: `screen-diff-${Date.now()}`,
    };
  }

  /**
   * 查询差异记录
   */
  @Get('diff/:baseScreenId/:targetScreenId')
  @ApiOperation({
    summary: '查询差异记录',
    description: '获取两个界面的差异分析结果',
  })
  @ApiParam({ name: 'baseScreenId', description: '基线界面ID' })
  @ApiParam({ name: 'targetScreenId', description: '目标界面ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
  })
  async findDiff(
    @Param('baseScreenId', ParseUUIDPipe) baseScreenId: string,
    @Param('targetScreenId', ParseUUIDPipe) targetScreenId: string,
  ) {
    const diff = await this.screenDiffService.findDiff(
      baseScreenId,
      targetScreenId,
    );
    return {
      code: 0,
      message: '查询成功',
      data: diff,
      traceId: `screen-diff-query-${Date.now()}`,
    };
  }

  /**
   * 获取界面的所有差异记录
   */
  @Get(':id/diffs')
  @ApiOperation({
    summary: '获取界面的所有差异记录',
    description: '查询该界面作为基线或目标的所有差异分析',
  })
  @ApiParam({ name: 'id', description: '界面ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
  })
  async findDiffsByScreen(@Param('id', ParseUUIDPipe) id: string) {
    const diffs = await this.screenDiffService.findDiffsByScreen(id);
    return {
      code: 0,
      message: '查询成功',
      data: diffs,
      traceId: `screen-diffs-${id}-${Date.now()}`,
    };
  }

  /**
   * 导出差异报告
   */
  @Get('diff/:diffId/export')
  @ApiOperation({
    summary: '导出差异报告',
    description: '导出界面差异的详细报告',
  })
  @ApiParam({ name: 'diffId', description: '差异记录ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '导出成功',
  })
  async exportDiffReport(@Param('diffId', ParseUUIDPipe) diffId: string) {
    const report = await this.screenDiffService.exportDiffReport(diffId);
    return {
      code: 0,
      message: '导出成功',
      data: report,
      traceId: `diff-export-${diffId}-${Date.now()}`,
    };
  }
}

