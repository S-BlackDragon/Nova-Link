import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { ModpacksModule } from './modpacks/modpacks.module';
import { ModrinthModule } from './modrinth/modrinth.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [PrismaModule, AuthModule, GroupsModule, ModpacksModule, ModrinthModule, MailModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
