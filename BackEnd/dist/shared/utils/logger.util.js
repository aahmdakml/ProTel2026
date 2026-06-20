"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
// Logger dibuat sebelum config agar bisa dipakai di config/index.ts jika perlu
// Menggunakan pino-pretty hanya di development untuk readability
exports.logger = (0, pino_1.default)({
    level: process.env['LOG_LEVEL'] ?? 'info',
    ...(process.env['NODE_ENV'] !== 'production' && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
                messageFormat: '{msg}',
            },
        },
    }),
});
//# sourceMappingURL=logger.util.js.map