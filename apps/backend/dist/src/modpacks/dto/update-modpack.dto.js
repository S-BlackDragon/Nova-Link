"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateModpackDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_modpack_dto_1 = require("./create-modpack.dto");
class UpdateModpackDto extends (0, mapped_types_1.PartialType)(create_modpack_dto_1.CreateModpackDto) {
}
exports.UpdateModpackDto = UpdateModpackDto;
//# sourceMappingURL=update-modpack.dto.js.map