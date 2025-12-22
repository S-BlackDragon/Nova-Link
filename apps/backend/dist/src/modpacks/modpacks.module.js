"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModpacksModule = void 0;
const common_1 = require("@nestjs/common");
const modpacks_service_1 = require("./modpacks.service");
const modpacks_controller_1 = require("./modpacks.controller");
const modrinth_module_1 = require("../modrinth/modrinth.module");
const prisma_module_1 = require("../prisma/prisma.module");
let ModpacksModule = class ModpacksModule {
};
exports.ModpacksModule = ModpacksModule;
exports.ModpacksModule = ModpacksModule = __decorate([
    (0, common_1.Module)({
        imports: [modrinth_module_1.ModrinthModule, prisma_module_1.PrismaModule],
        controllers: [modpacks_controller_1.ModpacksController],
        providers: [modpacks_service_1.ModpacksService],
    })
], ModpacksModule);
//# sourceMappingURL=modpacks.module.js.map