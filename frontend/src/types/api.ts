/**
 * API 响应基础类型
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  traceId: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

