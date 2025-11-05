import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '@/types/api';
import { logger } from '@/lib/utils/logger';

/**
 * API 客户端配置
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const API_TIMEOUT = 30000; // 30秒

/**
 * Axios 实例
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器
 */
axiosInstance.interceptors.request.use(
  (config) => {
    // 生成请求ID用于追踪
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    config.headers['X-Request-ID'] = requestId;

    // 记录请求日志（DEBUG级别）
    logger.debug(`API请求: ${config.method?.toUpperCase()} ${config.url}`, {
      module: 'API',
      data: {
        requestId,
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
        params: config.params,
        data: config.data,
        headers: config.headers,
      },
    });

    // 可以在这里添加认证 token
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    
    return config;
  },
  (error) => {
    logger.error('API请求配置错误', {
      module: 'API',
      error,
    });
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const requestId = response.config.headers['X-Request-ID'];
    const { data, status, statusText } = response;
    
    // 记录响应成功日志（DEBUG级别）
    logger.debug(`API响应: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      module: 'API',
      data: {
        requestId,
        status,
        statusText,
        code: data.code,
        message: data.message,
        data: data.data,
      },
    });
    
    // 如果 code 不为 0，视为业务错误
    if (data.code !== 0) {
      logger.warn(`API业务错误: ${data.message}`, {
        module: 'API',
        data: {
          requestId,
          code: data.code,
          url: response.config.url,
        },
      });
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    
    return response;
  },
  (error) => {
    const requestId = error.config?.headers?.['X-Request-ID'];
    
    // 处理网络错误
    if (error.response) {
      const { status, data } = error.response;
      
      let errorMessage = '';
      switch (status) {
        case 400:
          errorMessage = '请求参数错误';
          break;
        case 401:
          errorMessage = '未授权，请重新登录';
          break;
        case 403:
          errorMessage = '没有权限访问';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 500:
          errorMessage = '服务器错误';
          break;
        default:
          errorMessage = '请求失败';
      }
      
      logger.error(`API错误: ${errorMessage}`, {
        module: 'API',
        data: {
          requestId,
          status,
          url: error.config?.url,
          method: error.config?.method,
          data,
        },
        error,
      });
    } else if (error.request) {
      logger.error('网络错误，请检查网络连接', {
        module: 'API',
        data: {
          requestId,
          url: error.config?.url,
        },
        error,
      });
    } else {
      logger.error('请求配置错误', {
        module: 'API',
        data: { requestId },
        error,
      });
    }
    
    return Promise.reject(error);
  }
);

/**
 * API 客户端封装
 */
export class ApiClient {
  /**
   * GET 请求
   */
  static async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.get<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  /**
   * POST 请求
   */
  static async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await axiosInstance.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  /**
   * PUT 请求
   */
  static async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await axiosInstance.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  /**
   * PATCH 请求
   */
  static async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await axiosInstance.patch<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  /**
   * DELETE 请求
   */
  static async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  }
}

export default axiosInstance;

