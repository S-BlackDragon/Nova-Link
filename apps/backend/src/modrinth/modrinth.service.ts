import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ModrinthService {
    private readonly baseUrl = 'https://api.modrinth.com/v2';

    async searchMods(query: string, gameVersion?: string, loader?: string, projectType: string = 'mod', offset: number = 0, limit: number = 100) {
        try {
            const facets: string[][] = [
                [`project_type:${projectType}`]
            ];

            // Only add facets if they are provided and valid (not 'Any' or empty)
            if (gameVersion && gameVersion !== 'Any') {
                facets.push([`versions:${gameVersion}`]);
            }
            if (loader && loader !== 'Any' && projectType === 'mod') {
                facets.push([`categories:${loader.toLowerCase()}`]);
            }

            console.log('Searching Modrinth:', { query, facets: JSON.stringify(facets), offset, limit });

            const response = await axios.get(`${this.baseUrl}/search`, {
                params: {
                    query: query || '',
                    facets: JSON.stringify(facets),
                    limit: limit,
                    offset: offset,
                    index: query ? 'relevance' : 'downloads' // Use downloads for trending if no query
                },
                headers: {
                    'User-Agent': 'NovaLink/1.0.0 (alex@example.com)'
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
                    'User-Agent': 'NovaLink/1.0.0'
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
            if (loader && loader !== 'Any') params.loaders = loader.toLowerCase();
            if (gameVersion && gameVersion !== 'Any') params.game_versions = gameVersion;

            const response = await axios.get(`${this.baseUrl}/project/${id}/version`, {
                params,
                headers: {
                    'User-Agent': 'NovaLink/1.0.0'
                }
            });
            return response.data;
        } catch (error) {
            console.error(`Failed to get versions for ${id}`, error);
            throw new HttpException('Failed to get project versions', HttpStatus.BAD_GATEWAY);
        }
    }
    async checkStatus() {
        try {
            const response = await axios.get('https://api.modrinth.com/');
            return {
                status: 'operational',
                message: 'Modrinth API is online',
                details: response.data
            };
        } catch (error) {
            console.error('Modrinth status check failed:', error.message);
            return {
                status: 'down',
                message: 'Modrinth API is unreachable',
                error: error.message
            };
        }
    }
}
