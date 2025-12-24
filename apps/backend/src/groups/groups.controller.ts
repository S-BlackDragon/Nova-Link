import { Controller, Get, Post, Body, Param, UseGuards, Request, Req, Delete } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) { }

  @Post()
  create(@Req() req: any, @Body() body: { name: string }) {
    console.log(`[GroupsController] Received create request for "${body.name}" from user ${req.user?.id}`);
    return this.groupsService.createGroup(req.user.id, body.name);
  }

  @Post('join')
  join(@Req() req: any, @Body() body: { inviteCode: string }) {
    return this.groupsService.joinGroup(req.user.id, body.inviteCode);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.groupsService.getUserGroups(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.groupsService.getGroupDetails(req.user.id, id);
  }

  @Post(':id/target')
  updateTarget(@Req() req: any, @Param('id') id: string, @Body() body: { modpackId: string, versionId: string }) {
    return this.groupsService.updateTarget(req.user.id, id, body.modpackId, body.versionId);
  }

  @Post(':id/leave')
  leaveGroup(@Req() req: any, @Param('id') id: string) {
    return this.groupsService.leaveGroup(req.user.id, id);
  }

  @Delete(':id/members/:userId')
  removeMember(@Req() req: any, @Param('id') groupId: string, @Param('userId') userId: string) {
    return this.groupsService.removeMember(req.user.id, groupId, userId);
  }

  @Delete(':id')
  deleteGroup(@Req() req: any, @Param('id') id: string) {
    return this.groupsService.deleteGroup(req.user.id, id);
  }
}
