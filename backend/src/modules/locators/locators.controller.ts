import { Controller, Get, Post, Delete, Param, Body, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { LocatorsService } from './locators.service';
import { CreateLocatorCandidateDto, GenerateLocatorsDto } from './dto/create-locator.dto';
import { LocatorCandidateResponseDto } from './dto/locator-response.dto';

/**
 * 定位管理控制器
 */
@ApiTags('Locators')
@Controller('locators')
export class LocatorsController {
  constructor(private readonly locatorsService: LocatorsService) {}

  /**
   * 手动创建定位候选
   */
  @Post()
  @ApiOperation({ summary: '创建定位候选' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '定位候选创建成功',
    type: LocatorCandidateResponseDto,
  })
  async create(
    @Body() createLocatorDto: CreateLocatorCandidateDto,
  ): Promise<LocatorCandidateResponseDto> {
    return await this.locatorsService.create(createLocatorDto);
  }

  /**
   * 自动生成定位候选
   */
  @Post('generate')
  @ApiOperation({ summary: '自动生成定位候选', description: '基于 DOM 和视觉数据生成定位候选' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '生成成功',
    type: [LocatorCandidateResponseDto],
  })
  async generate(@Body() generateDto: GenerateLocatorsDto): Promise<LocatorCandidateResponseDto[]> {
    return await this.locatorsService.generateLocators(generateDto);
  }

  /**
   * 查询元素的所有定位候选
   */
  @Get('element/:elementId')
  @ApiOperation({ summary: '查询元素的所有定位候选' })
  @ApiParam({ name: 'elementId', description: '元素 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: [LocatorCandidateResponseDto],
  })
  async findByElement(
    @Param('elementId') elementId: string,
  ): Promise<LocatorCandidateResponseDto[]> {
    return await this.locatorsService.findByElement(elementId);
  }

  /**
   * 查询单个定位候选
   */
  @Get(':id')
  @ApiOperation({ summary: '查询定位候选详情' })
  @ApiParam({ name: 'id', description: '定位候选 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: LocatorCandidateResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<LocatorCandidateResponseDto> {
    return await this.locatorsService.findOne(id);
  }

  /**
   * 删除定位候选
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除定位候选' })
  @ApiParam({ name: 'id', description: '定位候选 ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: '删除成功' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.locatorsService.remove(id);
  }

  /**
   * 查询验证历史
   */
  @Get('element/:elementId/validation-history')
  @ApiOperation({ summary: '查询元素的验证历史' })
  @ApiParam({ name: 'elementId', description: '元素 ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '查询成功' })
  async getValidationHistory(@Param('elementId') elementId: string): Promise<any[]> {
    return await this.locatorsService.getValidationHistory(elementId);
  }
}
