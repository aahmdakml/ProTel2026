import { Pool } from 'pg';
import * as schema from './schema';
export declare const pool: Pool;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: Pool;
};
export declare function testConnection(): Promise<void>;
export declare function closePool(): Promise<void>;
export type DbClient = typeof db;
//# sourceMappingURL=client.d.ts.map