import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from '@/shared/utils/logger.util';
import { errorMiddleware } from '@/middleware/error.middleware';
import { healthRouter }           from '@/modules/health/health.router';
import { authRouter }             from '@/modules/auth/auth.router';
import { masterDataRouter }       from '@/modules/master-data/master-data.router';
import { ingestRouter }           from '@/modules/telemetry/ingest.router';
import { recommendationsRouter }  from '@/modules/recommendations/recommendations.router';
import { orthomosaicRouter }      from '@/modules/orthomosaic/orthomosaic.router';
import { mapVisualRouter }        from '@/modules/map-visual/map-visual.router';
import { archiveRouter }          from '@/modules/archive/archive.router';
import { dashboardRouter }        from '@/modules/dashboard/dashboard.router';
import { config } from '@/config';

const app = express();

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ---------------------------------------------------------------------------
// HTTP request logger (pino-http)
// ---------------------------------------------------------------------------
app.use(
  pinoHttp({
    logger,
    // Jangan log health checks agar tidak noise
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
  }),
);

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/health', healthRouter);
app.use('/auth',   authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/',       masterDataRouter);    // /fields, /sub-blocks, /devices, /crop-cycles, ...
app.use('/ingest', ingestRouter);        // POST /ingest/batch
app.use('/',       recommendationsRouter); // /fields/:id/recommendations, /alerts, ...
app.use('/',       orthomosaicRouter);     // /fields/:id/orthomosaic, /map-layers, ...
app.use('/',       mapVisualRouter);       // /fields/:id/map-visual, ...
app.use('/',       archiveRouter);         // /crop-cycles/:id/complete, ...

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
app.use(errorMiddleware);

export { app };
