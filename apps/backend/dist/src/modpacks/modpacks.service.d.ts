import { CreateModpackDto } from './dto/create-modpack.dto';
import { UpdateModpackDto } from './dto/update-modpack.dto';
import { PublishVersionDto } from './dto/publish-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ModrinthService } from '../modrinth/modrinth.service';
export declare class ModpacksService {
    private prisma;
    private modrinthService;
    constructor(prisma: PrismaService, modrinthService: ModrinthService);
    create(createModpackDto: CreateModpackDto): import(".prisma/client").Prisma.Prisma__ModpackClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        authorId: string;
        isPublic: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    publishVersion(id: string, publishVersionDto: PublishVersionDto): Promise<{
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
    }>;
    findAll(): import(".prisma/client").Prisma.PrismaPromise<({
        author: {
            id: string;
            username: string;
            email: string;
            passwordHash: string;
            isVerified: boolean;
            verificationCode: string | null;
            verificationExpires: Date | null;
            resetToken: string | null;
            resetExpires: Date | null;
            curseforgeToken: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        authorId: string;
        isPublic: boolean;
    })[]>;
    findByUser(userId: string): import(".prisma/client").Prisma.PrismaPromise<({
        versions: ({
            mods: {
                id: string;
                name: string;
                enabled: boolean;
                modpackVersionId: string;
                modrinthId: string;
                versionId: string | null;
                iconUrl: string | null;
                projectType: string;
            }[];
        } & {
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
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        authorId: string;
        isPublic: boolean;
    })[]>;
    findOne(id: string): import(".prisma/client").Prisma.Prisma__ModpackClient<({
        versions: ({
            mods: {
                id: string;
                name: string;
                enabled: boolean;
                modpackVersionId: string;
                modrinthId: string;
                versionId: string | null;
                iconUrl: string | null;
                projectType: string;
            }[];
        } & {
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
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        authorId: string;
        isPublic: boolean;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, updateModpackDto: UpdateModpackDto): import(".prisma/client").Prisma.Prisma__ModpackClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        authorId: string;
        isPublic: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    getManifest(versionId: string): Promise<{
        modpackName: string;
        versionNumber: string;
        gameVersion: string | null;
        loaderType: string | null;
        loaderVersion: string | null;
        mods: {
            id: string;
            name: string;
            enabled: boolean;
            modpackVersionId: string;
            modrinthId: string;
            versionId: string | null;
            iconUrl: string | null;
            projectType: string;
        }[];
    }>;
    addMod(versionId: string, modData: any): Promise<{
        id: string;
        name: string;
        enabled: boolean;
        modpackVersionId: string;
        modrinthId: string;
        versionId: string | null;
        iconUrl: string | null;
        projectType: string;
    }[]>;
    removeMod(modId: string): Promise<{
        id: string;
        name: string;
        enabled: boolean;
        modpackVersionId: string;
        modrinthId: string;
        versionId: string | null;
        iconUrl: string | null;
        projectType: string;
    }>;
    toggleMod(modId: string, enabled: boolean): Promise<{
        id: string;
        name: string;
        enabled: boolean;
        modpackVersionId: string;
        modrinthId: string;
        versionId: string | null;
        iconUrl: string | null;
        projectType: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        authorId: string;
        isPublic: boolean;
    }>;
}
