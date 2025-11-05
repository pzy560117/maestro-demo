import { ApiClient } from './client';
import type { Screen, Element, LocatorCandidate, ScreenDiff } from '@/types/screen';
import type { PaginatedResponse, PaginationParams } from '@/types/api';

/**
 * 界面 API 服务
 */
export class ScreensApi {
  /**
   * 获取界面列表
   */
  static async getScreens(params?: PaginationParams): Promise<PaginatedResponse<Screen>> {
    return ApiClient.get('/screens', { params });
  }

  /**
   * 根据签名获取界面详情
   */
  static async getScreenBySignature(signature: string): Promise<Screen> {
    return ApiClient.get(`/screens/${signature}`);
  }

  /**
   * 获取界面元素
   */
  static async getScreenElements(screenId: string): Promise<Element[]> {
    return ApiClient.get(`/screens/${screenId}/elements`);
  }

  /**
   * 获取元素定位候选
   */
  static async getElementLocators(elementId: string): Promise<LocatorCandidate[]> {
    return ApiClient.get(`/elements/${elementId}/locators`);
  }

  /**
   * 获取界面差异列表
   */
  static async getScreenDiffs(
    params?: PaginationParams & { signature?: string }
  ): Promise<PaginatedResponse<ScreenDiff>> {
    return ApiClient.get('/screens/diffs', { params });
  }

  /**
   * 对比两个界面
   */
  static async compareScreens(
    baselineSignature: string,
    currentSignature: string
  ): Promise<ScreenDiff> {
    return ApiClient.post('/screens/compare', {
      baselineSignature,
      currentSignature,
    });
  }
}

