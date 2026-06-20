export declare function syncFieldForecast(field: {
    id: string;
    adm4Code: string;
    name: string;
}): Promise<void>;
export declare function syncAllForecasts(): Promise<void>;
export declare function getLatestForecast(fieldId: string): Promise<{
    createdAt: Date;
    id: string;
    adm4Code: string;
    fieldId: string;
    temperatureC: string | null;
    humidityPct: string | null;
    fetchedAt: Date;
    analysisDate: Date | null;
    forecastValidFrom: Date;
    forecastValidUntil: Date;
    precipitationMm: string | null;
    cloudCoverPct: string | null;
    windSpeedKmh: string | null;
    windDirection: string | null;
    weatherCode: number | null;
    weatherDesc: string | null;
    bmkgCategory: string | null;
    fullResponseJson: unknown;
    isLatest: boolean;
    isStale: boolean;
}>;
export declare function getActiveWarnings(fieldId: string): Promise<{
    isActive: boolean;
    createdAt: Date;
    id: string;
    adm4Code: string;
    fieldId: string;
    validFrom: Date | null;
    fetchedAt: Date;
    fullResponseJson: unknown;
    warningType: string | null;
    warningLevel: string | null;
    warningExpiresAt: Date | null;
    warningText: string | null;
    dssAction: string | null;
}[]>;
//# sourceMappingURL=bmkg.service.d.ts.map