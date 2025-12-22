export declare class ModrinthService {
    private readonly baseUrl;
    searchMods(query: string, gameVersion?: string, loader?: string, projectType?: string): Promise<any>;
    getProject(id: string): Promise<any>;
    getProjectVersions(id: string, gameVersion?: string, loader?: string): Promise<any>;
}
