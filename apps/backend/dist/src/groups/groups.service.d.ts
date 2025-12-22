import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class GroupsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createGroupDto: CreateGroupDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        inviteCode: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }>;
    findAll(userId: string): Promise<({
        targetVersion: {
            id: string;
            createdAt: Date;
            versionNumber: string;
            gameVersion: string | null;
            loaderType: string | null;
            loaderVersion: string | null;
            manifestUrl: string | null;
            isPublished: boolean;
            modpackId: string;
            parentVersionId: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        inviteCode: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    })[]>;
    findOne(id: string): import(".prisma/client").Prisma.Prisma__GroupClient<({
        members: {
            id: string;
            userId: string;
            groupId: string;
            role: import(".prisma/client").$Enums.Role;
            joinedAt: Date;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        inviteCode: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, updateGroupDto: UpdateGroupDto): import(".prisma/client").Prisma.Prisma__GroupClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        inviteCode: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    joinByCode(userId: string, inviteCode: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        inviteCode: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        inviteCode: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }>;
}
