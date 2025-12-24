"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let GroupsService = class GroupsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createGroup(userId, name) {
        console.log(`[GroupsService] Creating group "${name}" for user ${userId}`);
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
                            role: client_1.Role.ADMIN
                        }
                    }
                },
                include: {
                    members: true
                }
            });
        }
        catch (err) {
            console.error('[GroupsService] Failed to create group:', err);
            throw err;
        }
    }
    async joinGroup(userId, inviteCode) {
        const group = await this.prisma.group.findUnique({
            where: { inviteCode }
        });
        if (!group) {
            throw new common_1.NotFoundException('Invalid invite code');
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
            throw new common_1.ConflictException('You are already a member of this group');
        }
        return this.prisma.groupMember.create({
            data: {
                groupId: group.id,
                userId,
                role: client_1.Role.MEMBER
            },
            include: {
                group: true
            }
        });
    }
    async getUserGroups(userId) {
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
    async getGroupDetails(userId, groupId) {
        const member = await this.prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } }
        });
        if (!member) {
            throw new common_1.ForbiddenException('You are not a member of this group');
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
    async updateTarget(userId, groupId, modpackId, versionId) {
        const member = await this.prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } }
        });
        if (!member || (member.role !== client_1.Role.ADMIN && member.role !== client_1.Role.MODERATOR)) {
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        const version = await this.prisma.modpackVersion.findUnique({
            where: { id: versionId }
        });
        if (!version || version.modpackId !== modpackId) {
            throw new common_1.BadRequestException('Invalid modpack version');
        }
        return this.prisma.group.update({
            where: { id: groupId },
            data: {
                targetModpackId: modpackId,
                targetVersionId: versionId
            }
        });
    }
    async leaveGroup(userId, groupId) {
        const member = await this.prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } }
        });
        if (!member)
            throw new common_1.NotFoundException('Not a member');
        if (member.role === client_1.Role.ADMIN) {
            const group = await this.prisma.group.findUnique({ where: { id: groupId } });
            if (group && group.ownerId === userId) {
                throw new common_1.BadRequestException('Owner cannot leave group. Delete it or transfer ownership.');
            }
        }
        return this.prisma.groupMember.delete({
            where: { groupId_userId: { groupId, userId } }
        });
    }
    async removeMember(requesterId, groupId, userIdToRemove) {
        const requester = await this.prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId: requesterId } }
        });
        if (!requester || (requester.role !== client_1.Role.ADMIN && requester.role !== client_1.Role.MODERATOR)) {
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        if (requesterId === userIdToRemove) {
            throw new common_1.BadRequestException('Cannot kick yourself');
        }
        const target = await this.prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId: userIdToRemove } }
        });
        if (!target)
            throw new common_1.NotFoundException('User not in group');
        if (target.role === client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Cannot kick an admin');
        }
        if (requester.role === client_1.Role.MODERATOR && target.role === client_1.Role.MODERATOR) {
            throw new common_1.ForbiddenException('Cannot kick another moderator');
        }
        return this.prisma.groupMember.delete({
            where: { groupId_userId: { groupId, userId: userIdToRemove } }
        });
    }
    async deleteGroup(userId, groupId) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId }
        });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.ownerId !== userId)
            throw new common_1.ForbiddenException('Only the owner can delete the group');
        await this.prisma.groupMember.deleteMany({
            where: { groupId }
        });
        return this.prisma.group.delete({
            where: { id: groupId }
        });
    }
};
exports.GroupsService = GroupsService;
exports.GroupsService = GroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GroupsService);
//# sourceMappingURL=groups.service.js.map