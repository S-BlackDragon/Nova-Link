import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) { }

  async createGroup(userId: string, name: string) {
    console.log(`[GroupsService] Creating group "${name}" for user ${userId}`);
    // Create unique invite code (simple 8-char alpanumeric)
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    try {
      return await this.prisma.group.create({
        data: {
          name,
          ownerId: userId,
          inviteCode,
          members: {
            create: {
              userId,
              role: Role.ADMIN
            }
          }
        },
        include: {
          members: true
        }
      });
    } catch (err) {
      console.error('[GroupsService] Failed to create group:', err);
      throw err;
    }
  }

  async joinGroup(userId: string, inviteCode: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode }
    });

    if (!group) {
      throw new NotFoundException('Invalid invite code');
    }

    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId
        }
      }
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this group');
    }

    return this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: Role.MEMBER
      },
      include: {
        group: true
      }
    });
  }

  async getUserGroups(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            targetModpack: true,
            targetVersion: true,
            _count: {
              select: { members: true }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    return memberships.map(m => ({
      ...m.group,
      myRole: m.role,
      memberCount: m.group._count.members
    }));
  }

  async getGroupDetails(userId: string, groupId: string) {
    // Verify membership
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true }
            }
          }
        },
        targetModpack: true,
        targetVersion: true
      }
    });
  }

  async updateTarget(userId: string, groupId: string, modpackId: string, versionId: string) {
    // ... existing impl
    // Verify permissions (ADMIN or MODERATOR)
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!member || (member.role !== Role.ADMIN && member.role !== Role.MODERATOR)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Verify modpack/version exist
    const version = await this.prisma.modpackVersion.findUnique({
      where: { id: versionId }
    });

    if (!version || version.modpackId !== modpackId) {
      throw new BadRequestException('Invalid modpack version');
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        targetModpackId: modpackId,
        targetVersionId: versionId
      }
    });
  }

  async leaveGroup(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });
    if (!member) throw new NotFoundException('Not a member');
    if (member.role === Role.ADMIN) {
      // Prevent last admin from leaving? Or transfer ownership?
      // For simplicity, allow leaving but if count goes to 0 group might persist or should be deleted.
      // Or if owning, maybe block? ownerId is on Group.
      const group = await this.prisma.group.findUnique({ where: { id: groupId } });
      if (group && group.ownerId === userId) {
        throw new BadRequestException('Owner cannot leave group. Delete it or transfer ownership.');
      }
    }
    return this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } }
    });
  }

  async removeMember(requesterId: string, groupId: string, userIdToRemove: string) {
    const requester = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: requesterId } }
    });

    if (!requester || (requester.role !== Role.ADMIN && requester.role !== Role.MODERATOR)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (requesterId === userIdToRemove) {
      throw new BadRequestException('Cannot kick yourself');
    }

    const target = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: userIdToRemove } }
    });

    if (!target) throw new NotFoundException('User not in group');

    if (target.role === Role.ADMIN) {
      throw new ForbiddenException('Cannot kick an admin');
    }

    // Mods can only kick members, not other mods
    if (requester.role === Role.MODERATOR && target.role === Role.MODERATOR) {
      throw new ForbiddenException('Cannot kick another moderator');
    }

    return this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: userIdToRemove } }
    });
  }

  async deleteGroup(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== userId) throw new ForbiddenException('Only the owner can delete the group');

    // Delete members first (or let Prisma handle if cascade is set)
    // Actually, prisma will handle it if schema is right, but let's be explicit if needed.
    await this.prisma.groupMember.deleteMany({
      where: { groupId }
    });

    return this.prisma.group.delete({
      where: { id: groupId }
    });
  }
}
