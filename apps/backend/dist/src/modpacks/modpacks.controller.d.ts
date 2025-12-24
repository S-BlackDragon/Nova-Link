import { ModpacksService } from './modpacks.service';
import { CreateModpackDto } from './dto/create-modpack.dto';
import { UpdateModpackDto } from './dto/update-modpack.dto';
import { PublishVersionDto } from './dto/publish-version.dto';
export declare class ModpacksController {
    private readonly modpacksService;
    constructor(modpacksService: ModpacksService);
    create(createModpackDto: CreateModpackDto): import(".prisma/client").Prisma.Prisma__ModpackClient<{
        id: string;
        name: string;
        description: string | null;
        isPublic: boolean;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    publishVersion(id: string, publishVersionDto: PublishVersionDto): Promise<{
        id: string;
        createdAt: Date;
        versionNumber: string;
        gameVersion: string | null;
        loaderType: string | null;
        loaderVersion: string | null;
        manifestUrl: string | null;
        manifestJson: import("@prisma/client/runtime/library").JsonValue | null;
        overridesKey: string | null;
        isPublished: boolean;
        modpackId: string;
        parentVersionId: string | null;
    }>;
    addMod(versionId: string, modData: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        author: string | null;
        iconUrl: string | null;
        summary: string | null;
        modrinthId: string | null;
        curseforgeId: string | null;
        versionId: string | null;
        filename: string | null;
        url: string | null;
        sha1: string | null;
        size: number | null;
        enabled: boolean;
        side: string;
        projectType: string;
        modpackVersionId: string;
    }[]>;
    removeMod(modId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        author: string | null;
        iconUrl: string | null;
        summary: string | null;
        modrinthId: string | null;
        curseforgeId: string | null;
        versionId: string | null;
        filename: string | null;
        url: string | null;
        sha1: string | null;
        size: number | null;
        enabled: boolean;
        side: string;
        projectType: string;
        modpackVersionId: string;
    }>;
    toggleMod(modId: string, body: {
        enabled: boolean;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        author: string | null;
        iconUrl: string | null;
        summary: string | null;
        modrinthId: string | null;
        curseforgeId: string | null;
        versionId: string | null;
        filename: string | null;
        url: string | null;
        sha1: string | null;
        size: number | null;
        enabled: boolean;
        side: string;
        projectType: string;
        modpackVersionId: string;
    }>;
    findAll(): import(".prisma/client").Prisma.PrismaPromise<({
        author: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            username: string;
            email: string;
            passwordHash: string;
            isVerified: boolean;
            verificationCode: string | null;
            verificationExpires: Date | null;
            resetToken: string | null;
            resetExpires: Date | null;
            curseforgeToken: string | null;
            avatarUrl: string | null;
        };
        versions: {
            id: string;
            createdAt: Date;
            versionNumber: string;
            gameVersion: string | null;
            loaderType: string | null;
            loaderVersion: string | null;
            manifestUrl: string | null;
            manifestJson: import("@prisma/client/runtime/library").JsonValue | null;
            overridesKey: string | null;
            isPublished: boolean;
            modpackId: string;
            parentVersionId: string | null;
        }[];
    } & {
        id: string;
        name: string;
        description: string | null;
        isPublic: boolean;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
    })[]>;
    findByUser(userId: string): import(".prisma/client").Prisma.PrismaPromise<({
        versions: ({
            mods: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                author: string | null;
                iconUrl: string | null;
                summary: string | null;
                modrinthId: string | null;
                curseforgeId: string | null;
                versionId: string | null;
                filename: string | null;
                url: string | null;
                sha1: string | null;
                size: number | null;
                enabled: boolean;
                side: string;
                projectType: string;
                modpackVersionId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            versionNumber: string;
            gameVersion: string | null;
            loaderType: string | null;
            loaderVersion: string | null;
            manifestUrl: string | null;
            manifestJson: import("@prisma/client/runtime/library").JsonValue | null;
            overridesKey: string | null;
            isPublished: boolean;
            modpackId: string;
            parentVersionId: string | null;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        isPublic: boolean;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
    })[]>;
    findSharedByUser(userId: string): Promise<any[]>;
    findOne(id: string): import(".prisma/client").Prisma.Prisma__ModpackClient<({
        versions: ({
            mods: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                author: string | null;
                iconUrl: string | null;
                summary: string | null;
                modrinthId: string | null;
                curseforgeId: string | null;
                versionId: string | null;
                filename: string | null;
                url: string | null;
                sha1: string | null;
                size: number | null;
                enabled: boolean;
                side: string;
                projectType: string;
                modpackVersionId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            versionNumber: string;
            gameVersion: string | null;
            loaderType: string | null;
            loaderVersion: string | null;
            manifestUrl: string | null;
            manifestJson: import("@prisma/client/runtime/library").JsonValue | null;
            overridesKey: string | null;
            isPublished: boolean;
            modpackId: string;
            parentVersionId: string | null;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        isPublic: boolean;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, updateModpackDto: UpdateModpackDto): import(".prisma/client").Prisma.Prisma__ModpackClient<{
        id: string;
        name: string;
        description: string | null;
        isPublic: boolean;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        isPublic: boolean;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
    }>;
}
