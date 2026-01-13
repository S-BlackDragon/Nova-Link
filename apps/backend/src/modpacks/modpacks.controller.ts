import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ModpacksService } from './modpacks.service';
import { CreateModpackDto } from './dto/create-modpack.dto';
import { UpdateModpackDto } from './dto/update-modpack.dto';
import { PublishVersionDto } from './dto/publish-version.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('modpacks')
@UseGuards(JwtAuthGuard)
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


  @Post('versions/:versionId/mods')
  addMod(@Param('versionId') versionId: string, @Body() modData: any, @Request() req: any) {
    return this.modpacksService.addMod(versionId, modData, req.user.id);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string, @Body() body: { suffix?: string }, @Request() req: any) {
    return this.modpacksService.cloneModpack(id, req.user.id, body.suffix);
  }

  @Delete('mods/:modId')
  removeMod(@Param('modId') modId: string, @Request() req: any) {
    return this.modpacksService.removeMod(modId, req.user.id);
  }

  @Patch('mods/:modId')
  toggleMod(@Param('modId') modId: string, @Body() body: { enabled: boolean }, @Request() req: any) {
    return this.modpacksService.toggleMod(modId, body.enabled, req.user.id);
  }

  @Get()
  findAll() {
    return this.modpacksService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.modpacksService.findByUser(userId);
  }

  @Get('user/:userId/shared')
  findSharedByUser(@Param('userId') userId: string) {
    return this.modpacksService.findSharedByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id;
    console.log(`[ModpacksController] findOne called for id=${id}, userId=${userId}`);
    return this.modpacksService.findOne(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateModpackDto: UpdateModpackDto, @Request() req: any) {
    return this.modpacksService.update(id, updateModpackDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.modpacksService.remove(id, req.user.id);
  }
}
