import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
export declare class GroupsController {
    private readonly groupsService;
    constructor(groupsService: GroupsService);
    join(body: {
        userId: string;
        inviteCode: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        inviteCode: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }>;
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
