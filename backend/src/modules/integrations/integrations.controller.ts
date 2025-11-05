import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppiumService } from './appium/appium.service';
import { AppiumRealService } from './appium/appium-real.service';
import { MidSceneService } from './midscene/midscene.service';
import { MidSceneRealService } from './midscene/midscene-real.service';
import { MidSceneDashScopeService } from './midscene/midscene-dashscope.service';
import { MinioService } from './storage/minio.service';

/**
 * 集成服务控制器
 * 提供健康检查和状态查询
 */
@ApiTags('Integrations - 集成服务')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly appiumMock: AppiumService,
    private readonly appiumReal: AppiumRealService,
    private readonly midsceneMock: MidSceneService,
    private readonly midsceneReal: MidSceneRealService,
    private readonly midsceneDashScope: MidSceneDashScopeService,
    private readonly minioService: MinioService,
  ) {}

  /**
   * 健康检查
   */
  @Get('health')
  @ApiOperation({ summary: '集成服务健康检查' })
  @ApiResponse({ status: 200, description: '健康检查结果' })
  async healthCheck() {
    const appiumEnabled = process.env.APPIUM_ENABLED === 'true';
    const midsceneEnabled = process.env.MIDSCENE_ENABLED === 'true';
    const minioEnabled = process.env.MINIO_ENABLED === 'true';

    // 选择 MidScene 服务：优先使用 DashScope，否则使用 Real 或 Mock
    let midsceneHealth;
    let midsceneMode = 'mock';
    
    if (midsceneEnabled) {
      // 检查是否配置了有效的 LLM API Key
      const hasValidApiKey = process.env.LLM_API_KEY && process.env.LLM_API_KEY !== 'sk-test-key';
      
      if (hasValidApiKey) {
        midsceneHealth = await this.midsceneDashScope.healthCheck();
        midsceneMode = 'dashscope';
      } else {
        midsceneHealth = await this.midsceneReal.healthCheck();
        midsceneMode = 'real';
      }
    } else {
      midsceneHealth = await this.midsceneMock.healthCheck();
      midsceneMode = 'mock';
    }

    const [appiumHealth, minioHealth] = await Promise.all([
      appiumEnabled
        ? this.appiumReal.healthCheck()
        : this.appiumMock.healthCheck(),
      this.minioService.healthCheck(),
    ]);

    const allHealthy =
      appiumHealth.status !== 'error' &&
      midsceneHealth.status !== 'error' &&
      (minioHealth.status === 'available' || minioHealth.status === 'disabled');

    return {
      code: 0,
      message: allHealthy ? 'All integrations healthy' : 'Some integrations have issues',
      data: {
        status: allHealthy ? 'ok' : 'degraded',
        integrations: {
          appium: {
            ...appiumHealth,
            mode: appiumEnabled ? 'real' : 'mock',
          },
          midscene: {
            ...midsceneHealth,
            mode: midsceneMode,
          },
          minio: {
            ...minioHealth,
            mode: minioEnabled ? 'enabled' : 'disabled',
          },
        },
        timestamp: new Date().toISOString(),
      },
      traceId: `health-check-${Date.now()}`,
    };
  }

  /**
   * 获取存储统计（仅 MinIO）
   */
  @Get('storage/stats')
  @ApiOperation({ summary: '获取存储统计信息' })
  @ApiResponse({ status: 200, description: '存储统计' })
  async getStorageStats() {
    const minioEnabled = process.env.MINIO_ENABLED === 'true';

    if (!minioEnabled) {
      return {
        code: 0,
        message: 'MinIO is disabled, using local file system',
        data: {
          mode: 'local',
          message: 'Storage statistics not available for local file system',
        },
        traceId: `storage-stats-${Date.now()}`,
      };
    }

    const stats = await this.minioService.getStorageStats();

    return {
      code: 0,
      message: 'Storage statistics retrieved',
      data: {
        mode: 'minio',
        ...stats,
      },
      traceId: `storage-stats-${Date.now()}`,
    };
  }

  /**
   * 获取 Appium 会话列表（仅真实模式）
   */
  @Get('appium/sessions')
  @ApiOperation({ summary: '获取 Appium 会话列表' })
  @ApiResponse({ status: 200, description: '会话列表' })
  async getAppiumSessions() {
    const appiumEnabled = process.env.APPIUM_ENABLED === 'true';

    if (!appiumEnabled) {
      return {
        code: 0,
        message: 'Appium is in mock mode',
        data: {
          mode: 'mock',
          sessions: [],
        },
        traceId: `appium-sessions-${Date.now()}`,
      };
    }

    const sessions = this.appiumReal.getSessions();

    return {
      code: 0,
      message: 'Active sessions retrieved',
      data: {
        mode: 'real',
        sessions,
        count: sessions.length,
      },
      traceId: `appium-sessions-${Date.now()}`,
    };
  }
}

