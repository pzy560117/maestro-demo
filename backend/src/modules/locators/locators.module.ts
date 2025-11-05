import { Module } from '@nestjs/common';
import { LocatorsService } from './locators.service';
import { LocatorsController } from './locators.controller';
import { LocatorGeneratorService } from './services/locator-generator.service';
import { LocatorValidatorService } from './services/locator-validator.service';
import { PrismaModule } from '../common/prisma/prisma.module';

/**
 * 定位管理模块
 * 功能 E & F：定位生成与验证
 */
@Module({
  imports: [PrismaModule],
  controllers: [LocatorsController],
  providers: [
    LocatorsService,
    LocatorGeneratorService,
    LocatorValidatorService,
  ],
  exports: [
    LocatorsService,
    LocatorGeneratorService,
    LocatorValidatorService,
  ],
})
export class LocatorsModule {}

