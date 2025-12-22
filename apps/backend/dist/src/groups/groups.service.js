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
let GroupsService = class GroupsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createGroupDto) {
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
    async findAll(userId) {
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
    findOne(id) {
        return this.prisma.group.findUnique({
            where: { id },
            include: { members: true },
        });
    }
    update(id, updateGroupDto) {
        return this.prisma.group.update({
            where: { id },
            data: updateGroupDto,
        });
    }
    async joinByCode(userId, inviteCode) {
        const group = await this.prisma.group.findUnique({
            where: {
                inviteCode
            },
        });
        if (!group) {
            throw new Error('Invalid invite code');
        }
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
    async remove(id) {
        await this.prisma.groupMember.deleteMany({ where: { groupId: id } });
        return this.prisma.group.delete({ where: { id } });
    }
};
exports.GroupsService = GroupsService;
exports.GroupsService = GroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GroupsService);
//# sourceMappingURL=groups.service.js.map