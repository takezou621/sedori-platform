import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ComplianceService } from './services/compliance.service';
import { ComplianceController } from './controllers/compliance.controller';
import { AntiqueLicense } from './entities/antique-license.entity';
import { RegulationRule } from './entities/regulation-rule.entity';
import { ComplianceCheck } from './entities/compliance-check.entity';
import { Product } from '../products/entities/product.entity';
import { ProductComplianceChecker } from './checkers/product-compliance.checker';
import { ComplianceAlertService } from './alerts/compliance-alert.service';
import { AntiqueDealerRules } from './rules/antique-dealer.rules';
import { ImportRestrictionRules } from './rules/import-restriction.rules';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AntiqueLicense,
      RegulationRule,
      ComplianceCheck,
      Product,
    ]),
    ScheduleModule.forRoot(),
    ConfigModule,
    NotificationsModule,
  ],
  controllers: [ComplianceController],
  providers: [
    ComplianceService,
    ProductComplianceChecker,
    ComplianceAlertService,
    AntiqueDealerRules,
    ImportRestrictionRules,
  ],
  exports: [
    ComplianceService,
    ProductComplianceChecker,
    ComplianceAlertService,
    AntiqueDealerRules,
    ImportRestrictionRules,
  ],
})
export class ComplianceModule {}
