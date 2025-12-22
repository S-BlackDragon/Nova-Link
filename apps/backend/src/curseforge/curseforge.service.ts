import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CurseforgeService {
    private readonly apiKey = process.env.CURSEFORGE_API_KEY || 'YOUR_API_KEY'; // TODO: Move to ConfigService
    private readonly baseUrl = 'https://api.curseforge.com/v1';

    async searchMods(query: string, gameVersion?: string) {
        console.log(`Searching for mods with query: "${query}", version: "${gameVersion}"`);
        console.log(`Using API Key: ${this.apiKey ? (this.apiKey.substring(0, 5) + '...') : 'MISSING'}`);

        try {
            const response = await axios.get(`${this.baseUrl}/mods/search`, {
                headers: { 'x-api-key': this.apiKey },
                params: {
                    gameId: 432, // Minecraft
                    searchFilter: query,
                    gameVersion: gameVersion,
                },
            });
            console.log(`Search successful, found ${response.data.data?.length || 0} results`);
            return response.data;
        } catch (error: any) {
            console.error('Failed to search mods:', error.response?.status, error.response?.data || error.message);
            throw new HttpException('Failed to search mods', HttpStatus.BAD_GATEWAY);
        }
    }

    async getMod(modId: number) {
        try {
            const response = await axios.get(`${this.baseUrl}/mods/${modId}`, {
                headers: { 'x-api-key': this.apiKey },
            });
            return response.data;
        } catch (error) {
            throw new HttpException('Failed to get mod details', HttpStatus.BAD_GATEWAY);
        }
    }

    async getModFiles(modId: number, gameVersion?: string, modLoaderType?: number) {
        try {
            const response = await axios.get(`${this.baseUrl}/mods/${modId}/files`, {
                headers: { 'x-api-key': this.apiKey },
                params: {
                    gameVersion: gameVersion,
                    modLoaderType: modLoaderType, // 1: Forge, 2: Cauldron, 3: LiteLoader, 4: Fabric, 5: Quilt, 6: NeoForge
                },
            });
            return response.data;
        } catch (error) {
            throw new HttpException('Failed to get mod files', HttpStatus.BAD_GATEWAY);
        }
    }

    async getModFileDownloadUrl(modId: number, fileId: number) {
        try {
            const response = await axios.get(`${this.baseUrl}/mods/${modId}/files/${fileId}/download-url`, {
                headers: { 'x-api-key': this.apiKey },
            });
            return response.data;
        } catch (error) {
            throw new HttpException('Failed to get download URL', HttpStatus.BAD_GATEWAY);
        }
    }
}
