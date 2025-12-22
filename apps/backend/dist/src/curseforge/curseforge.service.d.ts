export declare class CurseforgeService {
    private readonly apiKey;
    private readonly baseUrl;
    searchMods(query: string, gameVersion?: string): Promise<any>;
    getMod(modId: number): Promise<any>;
    getModFiles(modId: number, gameVersion?: string, modLoaderType?: number): Promise<any>;
    getModFileDownloadUrl(modId: number, fileId: number): Promise<any>;
}
