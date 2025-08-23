import { PartialType } from '@nestjs/swagger';
import { CreateAntiqueLicenseDto } from './create-antique-license.dto';

export class UpdateAntiqueLicenseDto extends PartialType(
  CreateAntiqueLicenseDto,
) {}
