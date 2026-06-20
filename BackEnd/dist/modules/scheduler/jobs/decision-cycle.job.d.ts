/**
 * Decision cycle job — runs every 30 min.
 *
 * Logi:
 * - 'siaga' fields: trigger setiap 30 menit
 * - 'normal' fields: trigger setiap 60 menit (hanya pada menit ke-00, bukan ke-30)
 *
 * Node-cron memanggil job ini setiap 30 menit.
 * Job sendiri yang memilih field mana yang perlu diproses.
 */
export declare function runDecisionCycleJob(): Promise<void>;
//# sourceMappingURL=decision-cycle.job.d.ts.map