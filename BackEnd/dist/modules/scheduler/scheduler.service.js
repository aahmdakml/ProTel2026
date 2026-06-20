"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = startScheduler;
exports.stopScheduler = stopScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_util_1 = require("../../shared/utils/logger.util");
const bmkg_sync_job_1 = require("./jobs/bmkg-sync.job");
const decision_cycle_job_1 = require("./jobs/decision-cycle.job");
const hst_updater_job_1 = require("./jobs/hst-updater.job");
const stale_flag_job_1 = require("./jobs/stale-flag.job");
// ---------------------------------------------------------------------------
// Guard: prevent concurrent overlapping runs per job
// ---------------------------------------------------------------------------
const runningJobs = new Set();
function guarded(name, fn) {
    return async () => {
        if (runningJobs.has(name)) {
            logger_util_1.logger.warn({ job: name }, 'Job still running — skipping this interval');
            return;
        }
        runningJobs.add(name);
        try {
            await fn();
        }
        catch (err) {
            logger_util_1.logger.error({ err, job: name }, 'Scheduler job uncaught error');
        }
        finally {
            runningJobs.delete(name);
        }
    };
}
// ---------------------------------------------------------------------------
// Start all cron jobs
// ---------------------------------------------------------------------------
function startScheduler() {
    // ── Stale flag — every 15 min ──────────────────────────────────────────
    node_cron_1.default.schedule('*/15 * * * *', guarded('stale_flag', stale_flag_job_1.runStaleFlagJob));
    // ── BMKG forecast sync — every 3 hours ────────────────────────────────
    node_cron_1.default.schedule('0 */3 * * *', guarded('bmkg_sync', bmkg_sync_job_1.runBmkgSyncJob));
    // ── Decision cycle — every 30 min ──────────────────────────────────────
    node_cron_1.default.schedule('*/30 * * * *', guarded('decision_cycle', decision_cycle_job_1.runDecisionCycleJob));
    // ── HST updater — daily midnight ───────────────────────────────────────
    node_cron_1.default.schedule('0 0 * * *', guarded('hst_updater', hst_updater_job_1.runHstUpdaterJob));
    logger_util_1.logger.info({
        stale_flag: '*/15 * * * *',
        bmkg_sync: '0 */3 * * *',
        decision_cycle: '*/30 * * * *',
        hst_updater: '0 0 * * *',
    }, '✓ Scheduler started — 4 jobs registered');
}
function stopScheduler() {
    node_cron_1.default.getTasks().forEach(task => task.stop());
    logger_util_1.logger.info('Scheduler stopped');
}
//# sourceMappingURL=scheduler.service.js.map