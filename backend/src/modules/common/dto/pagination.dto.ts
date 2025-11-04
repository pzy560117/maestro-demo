import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * 分页查询DTO
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: '页码（从1开始）',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  /**
   * 计算跳过的记录数
   */
  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.pageSize ?? 20);
  }

  /**
   * 获取取数量限制
   */
  get take(): number {
    return this.pageSize ?? 20;
  }
}

/**
 * 分页响应DTO
 */
export class PaginatedResponseDto<T> {
  @ApiPropertyOptional({ description: '数据列表' })
  items: T[];

  @ApiPropertyOptional({ description: '总记录数', example: 100 })
  total: number;

  @ApiPropertyOptional({ description: '当前页码', example: 1 })
  page: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  pageSize: number;

  @ApiPropertyOptional({ description: '总页数', example: 5 })
  totalPages: number;

  constructor(items: T[], total: number, page: number, pageSize: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.totalPages = Math.ceil(total / pageSize);
  }
}

