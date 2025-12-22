import { Module } from '@nestjs/common';
import { CurseforgeService } from './curseforge.service';

@Module({
  providers: [CurseforgeService]
})
export class CurseforgeModule {}
