import { Module } from '@nestjs/common';
import { ModpacksService } from './modpacks.service';
import { ModpacksController } from './modpacks.controller';
import { ModrinthModule } from '../modrinth/modrinth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ModrinthModule, PrismaModule],
  controllers: [ModpacksController],
  providers: [ModpacksService],
})
export class ModpacksModule { }
