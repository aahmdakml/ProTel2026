import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth }        from '@/middleware/auth.middleware';
import { requireFieldAccess } from '@/middleware/rbac.middleware';
import { validate }           from '@/middleware/validate.middleware';
import { successResponse }    from '@/shared/utils/response.util';
import { mapVisualService }   from './map-visual.service';

export const mapVisualRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => { fn(req, res).catch(next); };

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const MapVisualUploadSchema = z.object({
  filename:     z.string().min(1),
  content_type: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/),
});

const MapBoundsSchema = z.object({
  bounds: z.array(z.array(z.number())).length(2), // [[lat, lng], [lat, lng]] or similar
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST /fields/:id/map-visual/upload-url
mapVisualRouter.post(
  '/fields/:id/map-visual/upload-url',
  requireAuth,
  requireFieldAccess('manager'),
  validate(MapVisualUploadSchema),
  h(async (req, res) => {
    const result = await mapVisualService.requestUpload(
      req.params['id']!,
      req.body.filename,
      req.body.content_type,
    );
    res.json(successResponse(result));
  }),
);

// POST /fields/:id/map-visual/finalize
mapVisualRouter.post(
  '/fields/:id/map-visual/finalize',
  requireAuth,
  requireFieldAccess('manager'),
  h(async (req, res) => {
    const result = await mapVisualService.finalizeUpload(
      req.params['id']!,
      req.body.storage_key,
    );
    res.json(successResponse(result));
  }),
);

// PATCH /fields/:id/map-visual/bounds
mapVisualRouter.patch(
  '/fields/:id/map-visual/bounds',
  requireAuth,
  requireFieldAccess('manager'),
  validate(MapBoundsSchema),
  h(async (req, res) => {
    const result = await mapVisualService.updateBounds(
      req.params['id']!,
      req.body.bounds,
    );
    res.json(successResponse(result));
  }),
);

// DELETE /fields/:id/map-visual
mapVisualRouter.delete(
  '/fields/:id/map-visual',
  requireAuth,
  requireFieldAccess('manager'),
  h(async (req, res) => {
    await mapVisualService.deleteVisual(req.params['id']!);
    res.json(successResponse({ status: 'deleted' }));
  }),
);
