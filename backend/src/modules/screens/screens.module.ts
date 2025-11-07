import { Module, forwardRef } from '@nestjs/common';
import { ScreensService } from './screens.service';
import { ScreensController } from './screens.controller';
import { ScreenSignatureService } from './services/screen-signature.service';
import { ScreenStorageService } from './services/screen-storage.service';
import { ScreenDiffService } from './services/screen-diff.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { IntegrationsModule } from '../integrations/integrations.module';

/**
 * 界面管理模块
 * 功能 G：界面签名与存档（FR-09）
 * 功能 H：界面差异分析（FR-10, Iteration 3）
 */
@Module({
  imports: [PrismaModule, IntegrationsModule, forwardRef(() => AlertsModule)],
  controllers: [ScreensController],
  providers: [ScreensService, ScreenSignatureService, ScreenStorageService, ScreenDiffService],
  exports: [ScreensService, ScreenSignatureService, ScreenStorageService, ScreenDiffService],
})
export class ScreensModule {}
