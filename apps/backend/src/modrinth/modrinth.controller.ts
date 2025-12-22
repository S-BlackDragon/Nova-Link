import { Controller, Get, Query, Param } from '@nestjs/common';
import { ModrinthService } from './modrinth.service';

@Controller('modrinth')
export class ModrinthController {
    constructor(private readonly modrinthService: ModrinthService) { }

    @Get('search')
    search(
        @Query('query') query: string,
        @Query('gameVersion') gameVersion?: string,
        @Query('loader') loader?: string,
        @Query('projectType') projectType?: string,
    ) {
        return this.modrinthService.searchMods(query, gameVersion, loader, projectType);
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
}
