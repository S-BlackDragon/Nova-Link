"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModrinthService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let ModrinthService = class ModrinthService {
    baseUrl = 'https://api.modrinth.com/v2';
    async searchMods(query, gameVersion, loader, projectType = 'mod') {
        try {
            const facets = [
                [`project_type:${projectType}`]
            ];
            if (gameVersion)
                facets.push([`versions:${gameVersion}`]);
            if (loader && projectType === 'mod')
                facets.push([`categories:${loader.toLowerCase()}`]);
            console.log('Searching Modrinth:', { query, facets: JSON.stringify(facets) });
            const response = await axios_1.default.get(`${this.baseUrl}/search`, {
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
        }
        catch (error) {
            console.error('Failed to search Modrinth:', error.response?.data || error.message);
            throw new common_1.HttpException('Failed to search mods', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
    async getProject(id) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/project/${id}`, {
                headers: {
                    'User-Agent': 'AntigravityLauncher/1.0.0 (alex@example.com)'
                }
            });
            return response.data;
        }
        catch (error) {
            console.error(`Failed to get project ${id}`, error);
            throw new common_1.HttpException('Failed to get project details', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
    async getProjectVersions(id, gameVersion, loader) {
        try {
            const params = {};
            if (loader)
                params.loaders = JSON.stringify([loader.toLowerCase()]);
            if (gameVersion)
                params.game_versions = JSON.stringify([gameVersion]);
            const response = await axios_1.default.get(`${this.baseUrl}/project/${id}/version`, {
                params,
                headers: {
                    'User-Agent': 'AntigravityLauncher/1.0.0 (alex@example.com)'
                }
            });
            return response.data;
        }
        catch (error) {
            console.error(`Failed to get versions for ${id}`, error);
            throw new common_1.HttpException('Failed to get project versions', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
};
exports.ModrinthService = ModrinthService;
exports.ModrinthService = ModrinthService = __decorate([
    (0, common_1.Injectable)()
], ModrinthService);
//# sourceMappingURL=modrinth.service.js.map