import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetaController } from './beta.controller';
import { BetaService } from './beta.service';
import { BetaInvite } from './entities/beta-invite.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BetaInvite])],
  controllers: [BetaController],
  providers: [BetaService],
  exports: [BetaService],
})
export class BetaModule {}