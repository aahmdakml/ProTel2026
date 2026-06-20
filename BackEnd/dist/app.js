"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const pino_http_1 = require("pino-http");
const logger_util_1 = require("./shared/utils/logger.util");
const error_middleware_1 = require("./middleware/error.middleware");
const health_router_1 = require("./modules/health/health.router");
const auth_router_1 = require("./modules/auth/auth.router");
const master_data_router_1 = require("./modules/master-data/master-data.router");
const ingest_router_1 = require("./modules/telemetry/ingest.router");
const recommendations_router_1 = require("./modules/recommendations/recommendations.router");
const orthomosaic_router_1 = require("./modules/orthomosaic/orthomosaic.router");
const map_visual_router_1 = require("./modules/map-visual/map-visual.router");
const archive_router_1 = require("./modules/archive/archive.router");
const dashboard_router_1 = require("./modules/dashboard/dashboard.router");
const config_1 = require("./config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
exports.app = app;
// Pastikan direktori uploads ada
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadsDir));
// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use((0, cors_1.default)({
    origin: config_1.config.CORS_ORIGIN === '*' ? '*' : config_1.config.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// ---------------------------------------------------------------------------
// HTTP request logger (pino-http)
// ---------------------------------------------------------------------------
app.use((0, pino_http_1.pinoHttp)({
    logger: logger_util_1.logger,
    // Jangan log health checks agar tidak noise
    autoLogging: {
        ignore: (req) => req.url === '/health',
    },
}));
// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/health', health_router_1.healthRouter);
app.use('/auth', auth_router_1.authRouter);
app.use('/dashboard', dashboard_router_1.dashboardRouter);
app.use('/', master_data_router_1.masterDataRouter); // /fields, /sub-blocks, /devices, /crop-cycles, ...
app.use('/ingest', ingest_router_1.ingestRouter); // POST /ingest/batch
app.use('/', recommendations_router_1.recommendationsRouter); // /fields/:id/recommendations, /alerts, ...
app.use('/', orthomosaic_router_1.orthomosaicRouter); // /fields/:id/orthomosaic, /map-layers, ...
app.use('/', map_visual_router_1.mapVisualRouter); // /fields/:id/map-visual, ...
app.use('/', archive_router_1.archiveRouter); // /crop-cycles/:id/complete, ...
// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' },
    });
});
// ---------------------------------------------------------------------------
// Global error handler — HARUS paling akhir
// ---------------------------------------------------------------------------
app.use(error_middleware_1.errorMiddleware);
//# sourceMappingURL=app.js.map