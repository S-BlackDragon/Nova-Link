import { Controller, Get, Query, Param } from '@nestjs/common';
import { ModrinthService } from './modrinth.service';

@Controller('modrinth')
export class ModrinthController {
    constructor(private readonly modrinthService: ModrinthService) { }

    @Get('search')
    async search(
        @Query('query') query: string,
        @Query('gameVersion') gameVersion?: string,
        @Query('loader') loader?: string,
        @Query('projectType') projectType: string = 'mod',
        @Query('offset') offset: string = '0',
        @Query('limit') limit: string = '100'
    ) {
        return this.modrinthService.searchMods(
            query,
            gameVersion,
            loader,
            projectType,
            parseInt(offset),
            parseInt(limit)
        );
    }

    @Get('project/:id')
    getProject(@Param('id') id: string) {
        return this.modrinthService.getProject(id);
    }

    @Get('project/:id/versions')
    getVersions(
        @Param('id') id: string,
        @Query('gameVersion') gameVersion?: string,
        @Query('loader') loader?: string,
    ) {
        return this.modrinthService.getProjectVersions(id, gameVersion, loader);
    }
    @Get('status')
    async getStatus() {
        return this.modrinthService.checkStatus();
    }
}
