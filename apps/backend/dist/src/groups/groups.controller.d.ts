import { GroupsService } from './groups.service';
export declare class GroupsController {
    private readonly groupsService;
    constructor(groupsService: GroupsService);
    create(req: any, body: {
        name: string;
    }): Promise<{
        members: {
            id: string;
            role: import(".prisma/client").$Enums.Role;
            joinedAt: Date;
            userId: string;
            groupId: string;
        }[];
    } & {
        id: string;
        name: string;
        inviteCode: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }>;
    join(req: any, body: {
        inviteCode: string;
    }): Promise<{
        group: {
            id: string;
            name: string;
            inviteCode: string;
            createdAt: Date;
            updatedAt: Date;
            ownerId: string;
            targetModpackId: string | null;
            targetVersionId: string | null;
        };
    } & {
        id: string;
        role: import(".prisma/client").$Enums.Role;
        joinedAt: Date;
        userId: string;
        groupId: string;
    }>;
    findAll(req: any): Promise<{
        myRole: import(".prisma/client").$Enums.Role;
        memberCount: number;
        targetModpack: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            authorId: string;
            isPublic: boolean;
        } | null;
        targetVersion: {
            id: string;
            createdAt: Date;
            modpackId: string;
            versionNumber: string;
            gameVersion: string | null;
            loaderType: string | null;
            loaderVersion: string | null;
            manifestUrl: string | null;
            manifestJson: import("@prisma/client/runtime/library").JsonValue | null;
            overridesKey: string | null;
            parentVersionId: string | null;
            isPublished: boolean;
        } | null;
        _count: {
            members: number;
        };
        id: string;
        name: string;
        inviteCode: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }[]>;
    findOne(req: any, id: string): Promise<({
        targetModpack: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            authorId: string;
            isPublic: boolean;
        } | null;
        targetVersion: {
            id: string;
            createdAt: Date;
            modpackId: string;
            versionNumber: string;
            gameVersion: string | null;
            loaderType: string | null;
            loaderVersion: string | null;
            manifestUrl: string | null;
            manifestJson: import("@prisma/client/runtime/library").JsonValue | null;
            overridesKey: string | null;
            parentVersionId: string | null;
            isPublished: boolean;
        } | null;
        members: ({
            user: {
                id: string;
                username: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            role: import(".prisma/client").$Enums.Role;
            joinedAt: Date;
            userId: string;
            groupId: string;
        })[];
    } & {
        id: string;
        name: string;
        inviteCode: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }) | null>;
    updateTarget(req: any, id: string, body: {
        modpackId: string;
        versionId: string;
    }): Promise<{
        id: string;
        name: string;
        inviteCode: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }>;
    leaveGroup(req: any, id: string): Promise<{
        id: string;
        role: import(".prisma/client").$Enums.Role;
        joinedAt: Date;
        userId: string;
        groupId: string;
    }>;
    removeMember(req: any, groupId: string, userId: string): Promise<{
        id: string;
        role: import(".prisma/client").$Enums.Role;
        joinedAt: Date;
        userId: string;
        groupId: string;
    }>;
    deleteGroup(req: any, id: string): Promise<{
        id: string;
        name: string;
        inviteCode: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }>;
}
