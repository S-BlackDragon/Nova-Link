"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModpacksController = void 0;
const common_1 = require("@nestjs/common");
const modpacks_service_1 = require("./modpacks.service");
const create_modpack_dto_1 = require("./dto/create-modpack.dto");
const update_modpack_dto_1 = require("./dto/update-modpack.dto");
const publish_version_dto_1 = require("./dto/publish-version.dto");
let ModpacksController = class ModpacksController {
    modpacksService;
    constructor(modpacksService) {
        this.modpacksService = modpacksService;
    }
    create(createModpackDto) {
        return this.modpacksService.create(createModpackDto);
    }
    publishVersion(id, publishVersionDto) {
        return this.modpacksService.publishVersion(id, publishVersionDto);
    }
    getManifest(versionId) {
        return this.modpacksService.getManifest(versionId);
    }
    addMod(versionId, modData) {
        return this.modpacksService.addMod(versionId, modData);
    }
    removeMod(modId) {
        return this.modpacksService.removeMod(modId);
    }
    toggleMod(modId, body) {
        return this.modpacksService.toggleMod(modId, body.enabled);
    }
    findAll() {
        return this.modpacksService.findAll();
    }
    findByUser(userId) {
        return this.modpacksService.findByUser(userId);
    }
    findOne(id) {
        return this.modpacksService.findOne(id);
    }
    update(id, updateModpackDto) {
        return this.modpacksService.update(id, updateModpackDto);
    }
    remove(id) {
        return this.modpacksService.remove(id);
    }
};
exports.ModpacksController = ModpacksController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_modpack_dto_1.CreateModpackDto]),
    __metadata("design:returntype", void 0)
], ModpacksController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/versions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, publish_version_dto_1.PublishVersionDto]),
    __metadata("design:returntype", void 0)
], ModpacksController.prototype, "publishVersion", null);
__decorate([
    (0, common_1.Get)('versions/:versionId/manifest'),
    __param(0, (0, common_1.Param)('versionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ModpacksController.prototype, "getManifest", null);
__decorate([
    (0, common_1.Post)('versions/:versionId/mods'),
    __param(0, (0, common_1.Param)('versionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ModpacksController.prototype, "addMod", null);
__decorate([
    (0, common_1.Delete)('mods/:modId'),
    __param(0, (0, common_1.Param)('modId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ModpacksController.prototype, "removeMod", null);
__decorate([
    (0, common_1.Patch)('mods/:modId'),
    __param(0, (0, common_1.Param)('modId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ModpacksController.prototype, "toggleMod", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ModpacksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ModpacksController.prototype, "findByUser", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ModpacksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_modpack_dto_1.UpdateModpackDto]),
    __metadata("design:returntype", void 0)
], ModpacksController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ModpacksController.prototype, "remove", null);
exports.ModpacksController = ModpacksController = __decorate([
    (0, common_1.Controller)('modpacks'),
    __metadata("design:paramtypes", [modpacks_service_1.ModpacksService])
], ModpacksController);
//# sourceMappingURL=modpacks.controller.js.map