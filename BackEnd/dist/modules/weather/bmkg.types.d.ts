/** Satu slot waktu dalam forecast BMKG */
export interface BmkgTimeSlot {
    local_datetime: string;
    t?: number;
    hu?: number;
    tp?: number;
    ws?: number;
    wd_to?: string;
    wd_from?: string;
    weather?: number;
    weather_desc?: string;
    weather_desc_en?: string;
    image?: string;
}
/** Lokasi metadata dari BMKG */
export interface BmkgLokasi {
    adm4: string;
    desa: string;
    kecamatan: string;
    kotkab: string;
    provinsi: string;
    lon: number;
    lat: number;
    timezone: string;
}
/** Satu entri data forecast dari BMKG */
export interface BmkgDataEntry {
    lokasi: BmkgLokasi;
    cuaca: BmkgTimeSlot[][];
}
/** Full response pradikaan cuaca dari BMKG */
export interface BmkgForecastResponse {
    data: BmkgDataEntry[];
    lokasi: unknown;
}
/** Parsed/normalized slot yang akan disimpan ke DB */
export interface ParsedForecastSlot {
    forecastValidFrom: Date;
    forecastValidUntil: Date;
    temperatureC: number | null;
    humidityPct: number | null;
    precipitationMm: number | null;
    windSpeedKmh: number | null;
    windDirection: string | null;
    weatherCode: number | null;
    weatherDesc: string | null;
    bmkgCategory: string | null;
}
export declare function getBmkgCategory(weatherCode: number | undefined): string | null;
/** Parse satu time slot dari BMKG ke format normalized */
export declare function parseTimeSlot(slot: BmkgTimeSlot): ParsedForecastSlot | null;
//# sourceMappingURL=bmkg.types.d.ts.map