import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmService } from './llm.service';
import { LlmController } from './llm.controller';
import { PromptBuilderService } from './services/prompt-builder.service';
import { SafetyCheckService } from './services/safety-check.service';
import { LlmAuditService } from './services/llm-audit.service';
import { PrismaModule } from '../common/prisma/prisma.module';

/**
 * LLM 模块
 * 实现功能 D：LLM 指令生成与安全控制（FR-03/04）
 * 实现功能 J：LLM 审计日志（FR-13, Iteration 3）
 *
 * 提供：
 * - LLM 指令生成
 * - Prompt 构建
 * - 安全校验
 * - 审计日志记录与查询
 */
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [LlmController],
  providers: [LlmService, PromptBuilderService, SafetyCheckService, LlmAuditService],
  exports: [LlmService, LlmAuditService], // 导出供 Orchestrator 使用
})
export class LlmModule {}
