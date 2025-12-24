import { PrismaService } from '../prisma/prisma.service';
export declare class GroupsService {
    private prisma;
    constructor(prisma: PrismaService);
    createGroup(userId: string, name: string): Promise<{
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
    joinGroup(userId: string, inviteCode: string): Promise<{
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
    getUserGroups(userId: string): Promise<{
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
    getGroupDetails(userId: string, groupId: string): Promise<({
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
    updateTarget(userId: string, groupId: string, modpackId: string, versionId: string): Promise<{
        id: string;
        name: string;
        inviteCode: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        targetModpackId: string | null;
        targetVersionId: string | null;
    }>;
    leaveGroup(userId: string, groupId: string): Promise<{
        id: string;
        role: import(".prisma/client").$Enums.Role;
        joinedAt: Date;
        userId: string;
        groupId: string;
    }>;
    removeMember(requesterId: string, groupId: string, userIdToRemove: string): Promise<{
        id: string;
        role: import(".prisma/client").$Enums.Role;
        joinedAt: Date;
        userId: string;
        groupId: string;
    }>;
    deleteGroup(userId: string, groupId: string): Promise<{
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
