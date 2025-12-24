import { ModrinthService } from './modrinth.service';
export declare class ModrinthController {
    private readonly modrinthService;
    constructor(modrinthService: ModrinthService);
    search(query: string, gameVersion?: string, loader?: string, projectType?: string, offset?: string, limit?: string): Promise<any>;
    getProject(id: string): Promise<any>;
    getVersions(id: string, gameVersion?: string, loader?: string): Promise<any>;
    getStatus(): Promise<{
        status: string;
        message: string;
        details: any;
        error?: undefined;
    } | {
        status: string;
        message: string;
        error: any;
        details?: undefined;
    }>;
}
