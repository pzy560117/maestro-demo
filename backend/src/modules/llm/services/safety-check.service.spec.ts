import { Test, TestingModule } from '@nestjs/testing';
import { SafetyCheckService } from './safety-check.service';
import { AllowedActionType } from '../types/llm.types';

/**
 * 安全校验服务单元测试
 * 测试功能 D：LLM 安全控制（FR-04）
 */
describe('SafetyCheckService', () => {
  let service: SafetyCheckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SafetyCheckService],
    }).compile();

    service = module.get<SafetyCheckService>(SafetyCheckService);
  });

  describe('validateResponseFormat', () => {
    it('应拒绝空响应', () => {
      const result = service.validateResponseFormat(null);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('不是有效的 JSON 对象');
    });

    it('应拒绝缺少 actionPlan 的响应', () => {
      const result = service.validateResponseFormat({ someField: 'value' });
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('缺少 actionPlan');
    });

    it('应拒绝缺少 actionType 的响应', () => {
      const result = service.validateResponseFormat({
        actionPlan: { params: {} },
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('缺少 actionType');
    });

    it('应拒绝 confidence 不合法的响应', () => {
      const result = service.validateResponseFormat({
        actionPlan: {
          actionType: 'CLICK',
          params: {},
          confidence: 1.5,
        },
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('confidence');
    });

    it('应通过格式正确的响应', () => {
      const result = service.validateResponseFormat({
        actionPlan: {
          actionType: 'CLICK',
          params: { target: 'button' },
          confidence: 0.8,
        },
      });
      expect(result.passed).toBe(true);
    });
  });

  describe('checkActionWhitelist', () => {
    it('应拒绝不在白名单中的动作', () => {
      const result = service.checkActionWhitelist('UNINSTALL', [
        AllowedActionType.CLICK,
        AllowedActionType.INPUT,
      ]);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain('不在白名单');
      expect(result.fallbackAction).toBeDefined();
    });

    it('应通过白名单中的动作', () => {
      const result = service.checkActionWhitelist('CLICK', [
        AllowedActionType.CLICK,
        AllowedActionType.INPUT,
      ]);

      expect(result.passed).toBe(true);
    });
  });

  describe('performComprehensiveCheck', () => {
    const validResponse = {
      actionPlan: {
        actionType: AllowedActionType.CLICK,
        params: { target: '提交按钮' },
        description: '点击提交',
        confidence: 0.8,
      },
    };

    it('应通过所有校验的合法响应', () => {
      const result = service.performComprehensiveCheck(validResponse, [
        AllowedActionType.CLICK,
      ]);

      expect(result.passed).toBe(true);
    });

    it('应拒绝置信度过低的响应', () => {
      const lowConfidenceResponse = {
        actionPlan: {
          ...validResponse.actionPlan,
          confidence: 0.2,
        },
      };

      const result = service.performComprehensiveCheck(
        lowConfidenceResponse,
        [AllowedActionType.CLICK],
      );

      expect(result.passed).toBe(false);
      expect(result.reason).toContain('置信度过低');
    });

    it('应拒绝包含敏感关键词的点击动作', () => {
      const sensitiveResponse = {
        actionPlan: {
          actionType: AllowedActionType.CLICK,
          params: { target: '删除按钮' },
          description: '点击删除按钮',
          confidence: 0.8,
        },
      };

      const result = service.performComprehensiveCheck(sensitiveResponse, [
        AllowedActionType.CLICK,
      ]);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain('敏感元素');
    });
  });
});

