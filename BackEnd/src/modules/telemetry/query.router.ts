import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '@/middleware/auth.middleware';
import { successResponse } from '@/shared/utils/response.util';
import { db } from '@/db/client';
import { telemetryRecords } from '@/db/schema/trx';
import { eq, desc } from 'drizzle-orm';

export const telemetryQueryRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };

// ---------------------------------------------------------------------------
// GET /telemetry/sub-blocks/:subBlockId/history
//
// Mengembalikan riwayat pembacaan sensor pada sub-block tertentu
// ---------------------------------------------------------------------------
telemetryQueryRouter.get(
  '/sub-blocks/:subBlockId/history',
  requireAuth,
  h(async (req, res) => {
    const { subBlockId } = req.params;
    
    const records = await db
      .select()
      .from(telemetryRecords)
      .where(eq(telemetryRecords.subBlockId, subBlockId))
      .orderBy(desc(telemetryRecords.eventTimestamp))
      .limit(30);

    // Balik urutan agar ascending (untuk timeline grafik dari kiri ke kanan)
    res.json(successResponse(records.reverse()));
  }),
);

// ---------------------------------------------------------------------------
// GET /telemetry/fields/:fieldId/history
//
// Mengembalikan riwayat seluruh sub-block dalam satu field
// ---------------------------------------------------------------------------
telemetryQueryRouter.get(
  '/fields/:fieldId/history',
  requireAuth,
  h(async (req, res) => {
    const { fieldId } = req.params;

    // Ambil data bergabung dengan mst.sub_blocks
    const records = await db.execute(`
      SELECT r.*, sb.name as sub_block_name 
      FROM trx.telemetry_records r
      JOIN mst.sub_blocks sb ON r.sub_block_id = sb.id
      WHERE sb.field_id = '${fieldId}'
      ORDER BY r.event_timestamp DESC
      LIMIT 100
    `);

    // Balik urutan agar kronologis dari masa lampau ke sekarang
    res.json(successResponse(records.rows.reverse()));
  }),
);
