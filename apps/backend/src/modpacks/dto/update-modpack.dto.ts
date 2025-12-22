import { PartialType } from '@nestjs/mapped-types';
import { CreateModpackDto } from './create-modpack.dto';

export class UpdateModpackDto extends PartialType(CreateModpackDto) {}
