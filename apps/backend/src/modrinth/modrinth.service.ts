import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ModrinthService {
    private readonly baseUrl = 'https://api.modrinth.com/v2';

    async searchMods(query: string, gameVersion?: string, loader?: string, projectType: string = 'mod') {
        try {
            const facets: string[][] = [
                [`project_type:${projectType}`]
            ];

            if (gameVersion) facets.push([`versions:${gameVersion}`]);
            if (loader && projectType === 'mod') facets.push([`categories:${loader.toLowerCase()}`]);

            console.log('Searching Modrinth:', { query, facets: JSON.stringify(facets) });

            const response = await axios.get(`${this.baseUrl}/search`, {
                params: {
                    query,
                    facets: JSON.stringify(facets),
                    limit: 20,
                    index: 'relevance'
                },
                headers: {
                    'User-Agent': 'AntigravityLauncher/1.0.0 (alex@example.com)'
                }
            });

            console.log(`Modrinth search returned ${response.data.hits?.length || 0} hits`);
            return response.data;
        } catch (error: any) {
            console.error('Failed to search Modrinth:', error.response?.data || error.message);
            throw new HttpException('Failed to search mods', HttpStatus.BAD_GATEWAY);
        }
    }

    async getProject(id: string) {
        try {
            const response = await axios.get(`${this.baseUrl}/project/${id}`, {
                headers: {
                    'User-Agent': 'AntigravityLauncher/1.0.0 (alex@example.com)'
                }
            });
            return response.data;
        } catch (error) {
            console.error(`Failed to get project ${id}`, error);
            throw new HttpException('Failed to get project details', HttpStatus.BAD_GATEWAY);
        }
    }

    async getProjectVersions(id: string, gameVersion?: string, loader?: string) {
        try {
            const params: any = {};
            if (loader) params.loaders = JSON.stringify([loader.toLowerCase()]);
            if (gameVersion) params.game_versions = JSON.stringify([gameVersion]);

            const response = await axios.get(`${this.baseUrl}/project/${id}/version`, {
                params,
                headers: {
                    'User-Agent': 'AntigravityLauncher/1.0.0 (alex@example.com)'
                }
            });
            return response.data;
        } catch (error) {
            console.error(`Failed to get versions for ${id}`, error);
            throw new HttpException('Failed to get project versions', HttpStatus.BAD_GATEWAY);
        }
    }
}
