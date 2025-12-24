export declare class ModrinthService {
    private readonly baseUrl;
    searchMods(query: string, gameVersion?: string, loader?: string, projectType?: string, offset?: number, limit?: number): Promise<any>;
    getProject(id: string): Promise<any>;
    getProjectVersions(id: string, gameVersion?: string, loader?: string): Promise<any>;
    checkStatus(): Promise<{
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
