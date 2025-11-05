import { ApiClient } from './client';
import type { Task, TaskRun, CreateTaskDto, TaskStats } from '@/types/task';
import type { PaginatedResponse, PaginationParams } from '@/types/api';

/**
 * 任务 API 服务
 */
export class TasksApi {
  /**
   * 获取任务列表
   */
  static async getTasks(params?: PaginationParams): Promise<PaginatedResponse<Task>> {
    return ApiClient.get('/tasks', { params });
  }

  /**
   * 获取任务详情
   */
  static async getTask(id: string): Promise<Task> {
    return ApiClient.get(`/tasks/${id}`);
  }

  /**
   * 创建任务
   */
  static async createTask(data: CreateTaskDto): Promise<Task> {
    return ApiClient.post('/tasks', data);
  }

  /**
   * 取消任务
   */
  static async cancelTask(id: string): Promise<Task> {
    return ApiClient.post(`/tasks/${id}/cancel`);
  }

  /**
   * 重新运行任务
   */
  static async retryTask(id: string): Promise<Task> {
    return ApiClient.post(`/tasks/${id}/retry`);
  }

  /**
   * 获取任务统计信息
   */
  static async getTaskStats(): Promise<TaskStats> {
    return ApiClient.get('/tasks/stats');
  }

  /**
   * 获取任务运行记录
   */
  static async getTaskRuns(taskId: string): Promise<TaskRun[]> {
    return ApiClient.get(`/tasks/${taskId}/runs`);
  }
}

