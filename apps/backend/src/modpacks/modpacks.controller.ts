import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ModpacksService } from './modpacks.service';
import { CreateModpackDto } from './dto/create-modpack.dto';
import { UpdateModpackDto } from './dto/update-modpack.dto';
import { PublishVersionDto } from './dto/publish-version.dto';

@Controller('modpacks')
export class ModpacksController {
  constructor(private readonly modpacksService: ModpacksService) { }

  @Post()
  create(@Body() createModpackDto: CreateModpackDto) {
    return this.modpacksService.create(createModpackDto);
  }

  @Post(':id/versions')
  publishVersion(@Param('id') id: string, @Body() publishVersionDto: PublishVersionDto) {
    return this.modpacksService.publishVersion(id, publishVersionDto);
  }

  @Get('versions/:versionId/manifest')
  getManifest(@Param('versionId') versionId: string) {
    return this.modpacksService.getManifest(versionId);
  }

  @Post('versions/:versionId/mods')
  addMod(@Param('versionId') versionId: string, @Body() modData: any) {
    return this.modpacksService.addMod(versionId, modData);
  }

  @Delete('mods/:modId')
  removeMod(@Param('modId') modId: string) {
    return this.modpacksService.removeMod(modId);
  }

  @Patch('mods/:modId')
  toggleMod(@Param('modId') modId: string, @Body() body: { enabled: boolean }) {
    return this.modpacksService.toggleMod(modId, body.enabled);
  }

  @Get()
  findAll() {
    return this.modpacksService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.modpacksService.findByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modpacksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateModpackDto: UpdateModpackDto) {
    return this.modpacksService.update(id, updateModpackDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.modpacksService.remove(id);
  }
}
