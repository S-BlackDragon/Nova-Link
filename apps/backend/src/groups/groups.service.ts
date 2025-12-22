import { Injectable } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) { }

  async create(createGroupDto: CreateGroupDto) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name: createGroupDto.name,
          ownerId: createGroupDto.ownerId,
        },
      });

      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: createGroupDto.ownerId,
          role: 'ADMIN',
        },
      });

      return group;
    });
  }

  async findAll(userId: string) {
    return this.prisma.group.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        targetVersion: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
      include: { members: true },
    });
  }

  update(id: string, updateGroupDto: UpdateGroupDto) {
    return this.prisma.group.update({
      where: { id },
      data: updateGroupDto,
    });
  }

  async joinByCode(userId: string, inviteCode: string) {
    const group = await this.prisma.group.findUnique({
      where: {
        // @ts-ignore
        inviteCode
      },
    });

    if (!group) {
      throw new Error('Invalid invite code');
    }

    // Check if already a member
    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userId,
        },
      },
    });

    if (existingMember) {
      return group;
    }

    await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: userId,
        role: 'MEMBER',
      },
    });

    return group;
  }

  async remove(id: string) {
    // Delete all members first
    await this.prisma.groupMember.deleteMany({ where: { groupId: id } });
    // Delete the group
    return this.prisma.group.delete({ where: { id } });
  }
}
