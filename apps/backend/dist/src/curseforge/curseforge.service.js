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
exports.CurseforgeService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let CurseforgeService = class CurseforgeService {
    apiKey = process.env.CURSEFORGE_API_KEY || 'YOUR_API_KEY';
    baseUrl = 'https://api.curseforge.com/v1';
    async searchMods(query, gameVersion) {
        console.log(`Searching for mods with query: "${query}", version: "${gameVersion}"`);
        console.log(`Using API Key: ${this.apiKey ? (this.apiKey.substring(0, 5) + '...') : 'MISSING'}`);
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/mods/search`, {
                headers: { 'x-api-key': this.apiKey },
                params: {
                    gameId: 432,
                    searchFilter: query,
                    gameVersion: gameVersion,
                },
            });
            console.log(`Search successful, found ${response.data.data?.length || 0} results`);
            return response.data;
        }
        catch (error) {
            console.error('Failed to search mods:', error.response?.status, error.response?.data || error.message);
            throw new common_1.HttpException('Failed to search mods', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
    async getMod(modId) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/mods/${modId}`, {
                headers: { 'x-api-key': this.apiKey },
            });
            return response.data;
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get mod details', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
    async getModFiles(modId, gameVersion, modLoaderType) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/mods/${modId}/files`, {
                headers: { 'x-api-key': this.apiKey },
                params: {
                    gameVersion: gameVersion,
                    modLoaderType: modLoaderType,
                },
            });
            return response.data;
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get mod files', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
    async getModFileDownloadUrl(modId, fileId) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/mods/${modId}/files/${fileId}/download-url`, {
                headers: { 'x-api-key': this.apiKey },
            });
            return response.data;
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get download URL', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
};
exports.CurseforgeService = CurseforgeService;
exports.CurseforgeService = CurseforgeService = __decorate([
    (0, common_1.Injectable)()
], CurseforgeService);
//# sourceMappingURL=curseforge.service.js.map