export interface DashboardSummaryDto {
    totalFields: number;
    monitoredSubBlocks: number;
    pendingRecommendations: number;
    systemAlerts: number;
    recentAlerts: Array<{
        id: string;
        field: string;
        issue: string;
        time: string;
        severity: string;
        createdAt: Date;
    }>;
}
declare class DashboardService {
    /**
     * Retrieves summary statistics for the dashboard
     * Admin sees all, regular user sees their assigned fields.
     */
    getSummary(userId: string, isSystemAdmin: boolean): Promise<DashboardSummaryDto>;
}
export declare const dashboardService: DashboardService;
export {};
//# sourceMappingURL=dashboard.service.d.ts.map