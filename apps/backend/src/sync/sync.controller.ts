import { Controller, Get, Param, UseGuards, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
    constructor(private readonly syncService: SyncService) { }

    @Get('manifest/:versionId')
    getManifest(@Param('versionId') versionId: string) {
        return this.syncService.getManifest(versionId);
    }

    @Get('overrides/:versionId')
    getOverrides(@Param('versionId') versionId: string) {
        return this.syncService.getOverridesStream(versionId);
    }

    @Post('overrides/:versionId')
    @UseInterceptors(FileInterceptor('file'))
    uploadOverrides(
        @Param('versionId') versionId: string,
        @UploadedFile() file: any
    ) {
        return this.syncService.saveOverrides(versionId, file);
    }
}
