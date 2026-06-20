import { z } from 'zod';
export declare const SensorDataSchema: z.ZodObject<{
    water_level_cm: z.ZodOptional<z.ZodNumber>;
    temperature_c: z.ZodOptional<z.ZodNumber>;
    humidity_pct: z.ZodOptional<z.ZodNumber>;
    battery_pct: z.ZodOptional<z.ZodNumber>;
    signal_rssi: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    water_level_cm: z.ZodOptional<z.ZodNumber>;
    temperature_c: z.ZodOptional<z.ZodNumber>;
    humidity_pct: z.ZodOptional<z.ZodNumber>;
    battery_pct: z.ZodOptional<z.ZodNumber>;
    signal_rssi: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    water_level_cm: z.ZodOptional<z.ZodNumber>;
    temperature_c: z.ZodOptional<z.ZodNumber>;
    humidity_pct: z.ZodOptional<z.ZodNumber>;
    battery_pct: z.ZodOptional<z.ZodNumber>;
    signal_rssi: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
export declare const ReadingSchema: z.ZodObject<{
    device_code: z.ZodString;
    timestamp: z.ZodOptional<z.ZodString>;
    seq_number: z.ZodOptional<z.ZodNumber>;
    data: z.ZodObject<{
        water_level_cm: z.ZodOptional<z.ZodNumber>;
        temperature_c: z.ZodOptional<z.ZodNumber>;
        humidity_pct: z.ZodOptional<z.ZodNumber>;
        battery_pct: z.ZodOptional<z.ZodNumber>;
        signal_rssi: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        water_level_cm: z.ZodOptional<z.ZodNumber>;
        temperature_c: z.ZodOptional<z.ZodNumber>;
        humidity_pct: z.ZodOptional<z.ZodNumber>;
        battery_pct: z.ZodOptional<z.ZodNumber>;
        signal_rssi: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        water_level_cm: z.ZodOptional<z.ZodNumber>;
        temperature_c: z.ZodOptional<z.ZodNumber>;
        humidity_pct: z.ZodOptional<z.ZodNumber>;
        battery_pct: z.ZodOptional<z.ZodNumber>;
        signal_rssi: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    data: {
        water_level_cm?: number | undefined;
        temperature_c?: number | undefined;
        humidity_pct?: number | undefined;
        battery_pct?: number | undefined;
        signal_rssi?: number | undefined;
    } & {
        [k: string]: unknown;
    };
    device_code: string;
    seq_number?: number | undefined;
    timestamp?: string | undefined;
}, {
    data: {
        water_level_cm?: number | undefined;
        temperature_c?: number | undefined;
        humidity_pct?: number | undefined;
        battery_pct?: number | undefined;
        signal_rssi?: number | undefined;
    } & {
        [k: string]: unknown;
    };
    device_code: string;
    seq_number?: number | undefined;
    timestamp?: string | undefined;
}>;
export declare const BatchPayloadSchema: z.ZodObject<{
    field_id: z.ZodString;
    gateway_code: z.ZodOptional<z.ZodString>;
    readings: z.ZodArray<z.ZodObject<{
        device_code: z.ZodString;
        timestamp: z.ZodOptional<z.ZodString>;
        seq_number: z.ZodOptional<z.ZodNumber>;
        data: z.ZodObject<{
            water_level_cm: z.ZodOptional<z.ZodNumber>;
            temperature_c: z.ZodOptional<z.ZodNumber>;
            humidity_pct: z.ZodOptional<z.ZodNumber>;
            battery_pct: z.ZodOptional<z.ZodNumber>;
            signal_rssi: z.ZodOptional<z.ZodNumber>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            water_level_cm: z.ZodOptional<z.ZodNumber>;
            temperature_c: z.ZodOptional<z.ZodNumber>;
            humidity_pct: z.ZodOptional<z.ZodNumber>;
            battery_pct: z.ZodOptional<z.ZodNumber>;
            signal_rssi: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            water_level_cm: z.ZodOptional<z.ZodNumber>;
            temperature_c: z.ZodOptional<z.ZodNumber>;
            humidity_pct: z.ZodOptional<z.ZodNumber>;
            battery_pct: z.ZodOptional<z.ZodNumber>;
            signal_rssi: z.ZodOptional<z.ZodNumber>;
        }, z.ZodTypeAny, "passthrough">>;
    }, "strip", z.ZodTypeAny, {
        data: {
            water_level_cm?: number | undefined;
            temperature_c?: number | undefined;
            humidity_pct?: number | undefined;
            battery_pct?: number | undefined;
            signal_rssi?: number | undefined;
        } & {
            [k: string]: unknown;
        };
        device_code: string;
        seq_number?: number | undefined;
        timestamp?: string | undefined;
    }, {
        data: {
            water_level_cm?: number | undefined;
            temperature_c?: number | undefined;
            humidity_pct?: number | undefined;
            battery_pct?: number | undefined;
            signal_rssi?: number | undefined;
        } & {
            [k: string]: unknown;
        };
        device_code: string;
        seq_number?: number | undefined;
        timestamp?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    field_id: string;
    readings: {
        data: {
            water_level_cm?: number | undefined;
            temperature_c?: number | undefined;
            humidity_pct?: number | undefined;
            battery_pct?: number | undefined;
            signal_rssi?: number | undefined;
        } & {
            [k: string]: unknown;
        };
        device_code: string;
        seq_number?: number | undefined;
        timestamp?: string | undefined;
    }[];
    gateway_code?: string | undefined;
}, {
    field_id: string;
    readings: {
        data: {
            water_level_cm?: number | undefined;
            temperature_c?: number | undefined;
            humidity_pct?: number | undefined;
            battery_pct?: number | undefined;
            signal_rssi?: number | undefined;
        } & {
            [k: string]: unknown;
        };
        device_code: string;
        seq_number?: number | undefined;
        timestamp?: string | undefined;
    }[];
    gateway_code?: string | undefined;
}>;
export type BatchPayload = z.infer<typeof BatchPayloadSchema>;
export type SensorData = z.infer<typeof SensorDataSchema>;
export type Reading = z.infer<typeof ReadingSchema>;
//# sourceMappingURL=ingest.schema.d.ts.map