import { z } from 'zod';
export declare const GeoJsonPolygonSchema: z.ZodObject<{
    type: z.ZodLiteral<"Polygon">;
    coordinates: z.ZodArray<z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, "many">;
}, "strip", z.ZodTypeAny, {
    type: "Polygon";
    coordinates: [number, number][][];
}, {
    type: "Polygon";
    coordinates: [number, number][][];
}>;
export declare const GeoJsonFeatureSchema: z.ZodObject<{
    type: z.ZodLiteral<"Feature">;
    geometry: z.ZodObject<{
        type: z.ZodLiteral<"Polygon">;
        coordinates: z.ZodArray<z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "Polygon";
        coordinates: [number, number][][];
    }, {
        type: "Polygon";
        coordinates: [number, number][][];
    }>;
    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "Feature";
    geometry: {
        type: "Polygon";
        coordinates: [number, number][][];
    };
    properties?: Record<string, unknown> | undefined;
}, {
    type: "Feature";
    geometry: {
        type: "Polygon";
        coordinates: [number, number][][];
    };
    properties?: Record<string, unknown> | undefined;
}>;
export declare const GeoJsonFeatureCollectionSchema: z.ZodObject<{
    type: z.ZodLiteral<"FeatureCollection">;
    features: z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<"Feature">;
        geometry: z.ZodObject<{
            type: z.ZodLiteral<"Polygon">;
            coordinates: z.ZodArray<z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, "many">;
        }, "strip", z.ZodTypeAny, {
            type: "Polygon";
            coordinates: [number, number][][];
        }, {
            type: "Polygon";
            coordinates: [number, number][][];
        }>;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "Feature";
        geometry: {
            type: "Polygon";
            coordinates: [number, number][][];
        };
        properties?: Record<string, unknown> | undefined;
    }, {
        type: "Feature";
        geometry: {
            type: "Polygon";
            coordinates: [number, number][][];
        };
        properties?: Record<string, unknown> | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "FeatureCollection";
    features: {
        type: "Feature";
        geometry: {
            type: "Polygon";
            coordinates: [number, number][][];
        };
        properties?: Record<string, unknown> | undefined;
    }[];
}, {
    type: "FeatureCollection";
    features: {
        type: "Feature";
        geometry: {
            type: "Polygon";
            coordinates: [number, number][][];
        };
        properties?: Record<string, unknown> | undefined;
    }[];
}>;
export type GeoJsonPolygon = z.infer<typeof GeoJsonPolygonSchema>;
export type GeoJsonFeature = z.infer<typeof GeoJsonFeatureSchema>;
export type GeoJsonFeatureCollection = z.infer<typeof GeoJsonFeatureCollectionSchema>;
export declare const CreateFieldSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    adm4_code: z.ZodString;
    water_source_type: z.ZodDefault<z.ZodEnum<["irrigated", "rainfed", "lowland"]>>;
    area_hectares: z.ZodOptional<z.ZodNumber>;
    operator_count_default: z.ZodDefault<z.ZodNumber>;
    decision_cycle_mode: z.ZodDefault<z.ZodEnum<["normal", "siaga"]>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    adm4_code: string;
    water_source_type: "irrigated" | "rainfed" | "lowland";
    operator_count_default: number;
    decision_cycle_mode: "normal" | "siaga";
    description?: string | undefined;
    area_hectares?: number | undefined;
    notes?: string | undefined;
}, {
    name: string;
    adm4_code: string;
    description?: string | undefined;
    water_source_type?: "irrigated" | "rainfed" | "lowland" | undefined;
    area_hectares?: number | undefined;
    operator_count_default?: number | undefined;
    decision_cycle_mode?: "normal" | "siaga" | undefined;
    notes?: string | undefined;
}>;
export declare const UpdateFieldSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    adm4_code: z.ZodOptional<z.ZodString>;
    water_source_type: z.ZodOptional<z.ZodDefault<z.ZodEnum<["irrigated", "rainfed", "lowland"]>>>;
    area_hectares: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    operator_count_default: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    decision_cycle_mode: z.ZodOptional<z.ZodDefault<z.ZodEnum<["normal", "siaga"]>>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    name?: string | undefined;
    adm4_code?: string | undefined;
    water_source_type?: "irrigated" | "rainfed" | "lowland" | undefined;
    area_hectares?: number | undefined;
    operator_count_default?: number | undefined;
    decision_cycle_mode?: "normal" | "siaga" | undefined;
    notes?: string | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
    adm4_code?: string | undefined;
    water_source_type?: "irrigated" | "rainfed" | "lowland" | undefined;
    area_hectares?: number | undefined;
    operator_count_default?: number | undefined;
    decision_cycle_mode?: "normal" | "siaga" | undefined;
    notes?: string | undefined;
}>;
export declare const AssignUserFieldSchema: z.ZodObject<{
    user_id: z.ZodString;
    field_role: z.ZodDefault<z.ZodEnum<["manager", "operator", "viewer"]>>;
}, "strip", z.ZodTypeAny, {
    user_id: string;
    field_role: "operator" | "manager" | "viewer";
}, {
    user_id: string;
    field_role?: "operator" | "manager" | "viewer" | undefined;
}>;
export declare const CreateSubBlockSchema: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    polygon_geom: z.ZodObject<{
        type: z.ZodLiteral<"Polygon">;
        coordinates: z.ZodArray<z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "Polygon";
        coordinates: [number, number][][];
    }, {
        type: "Polygon";
        coordinates: [number, number][][];
    }>;
    elevation_m: z.ZodOptional<z.ZodNumber>;
    soil_type: z.ZodOptional<z.ZodString>;
    display_order: z.ZodDefault<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    polygon_geom: {
        type: "Polygon";
        coordinates: [number, number][][];
    };
    display_order: number;
    code?: string | undefined;
    notes?: string | undefined;
    elevation_m?: number | undefined;
    soil_type?: string | undefined;
}, {
    name: string;
    polygon_geom: {
        type: "Polygon";
        coordinates: [number, number][][];
    };
    code?: string | undefined;
    notes?: string | undefined;
    elevation_m?: number | undefined;
    soil_type?: string | undefined;
    display_order?: number | undefined;
}>;
export declare const UpdateSubBlockSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    polygon_geom: z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"Polygon">;
        coordinates: z.ZodArray<z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "Polygon";
        coordinates: [number, number][][];
    }, {
        type: "Polygon";
        coordinates: [number, number][][];
    }>>;
    elevation_m: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    soil_type: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    display_order: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    name?: string | undefined;
    notes?: string | undefined;
    polygon_geom?: {
        type: "Polygon";
        coordinates: [number, number][][];
    } | undefined;
    elevation_m?: number | undefined;
    soil_type?: string | undefined;
    display_order?: number | undefined;
}, {
    code?: string | undefined;
    name?: string | undefined;
    notes?: string | undefined;
    polygon_geom?: {
        type: "Polygon";
        coordinates: [number, number][][];
    } | undefined;
    elevation_m?: number | undefined;
    soil_type?: string | undefined;
    display_order?: number | undefined;
}>;
export declare const ImportSubBlocksSchema: z.ZodObject<{
    geojson: z.ZodObject<{
        type: z.ZodLiteral<"FeatureCollection">;
        features: z.ZodArray<z.ZodObject<{
            type: z.ZodLiteral<"Feature">;
            geometry: z.ZodObject<{
                type: z.ZodLiteral<"Polygon">;
                coordinates: z.ZodArray<z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, "many">;
            }, "strip", z.ZodTypeAny, {
                type: "Polygon";
                coordinates: [number, number][][];
            }, {
                type: "Polygon";
                coordinates: [number, number][][];
            }>;
            properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            type: "Feature";
            geometry: {
                type: "Polygon";
                coordinates: [number, number][][];
            };
            properties?: Record<string, unknown> | undefined;
        }, {
            type: "Feature";
            geometry: {
                type: "Polygon";
                coordinates: [number, number][][];
            };
            properties?: Record<string, unknown> | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "FeatureCollection";
        features: {
            type: "Feature";
            geometry: {
                type: "Polygon";
                coordinates: [number, number][][];
            };
            properties?: Record<string, unknown> | undefined;
        }[];
    }, {
        type: "FeatureCollection";
        features: {
            type: "Feature";
            geometry: {
                type: "Polygon";
                coordinates: [number, number][][];
            };
            properties?: Record<string, unknown> | undefined;
        }[];
    }>;
    name_field: z.ZodDefault<z.ZodString>;
    code_field: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    geojson: {
        type: "FeatureCollection";
        features: {
            type: "Feature";
            geometry: {
                type: "Polygon";
                coordinates: [number, number][][];
            };
            properties?: Record<string, unknown> | undefined;
        }[];
    };
    name_field: string;
    code_field?: string | undefined;
}, {
    geojson: {
        type: "FeatureCollection";
        features: {
            type: "Feature";
            geometry: {
                type: "Polygon";
                coordinates: [number, number][][];
            };
            properties?: Record<string, unknown> | undefined;
        }[];
    };
    name_field?: string | undefined;
    code_field?: string | undefined;
}>;
export declare const CreateDeviceSchema: z.ZodObject<{
    device_code: z.ZodString;
    device_type: z.ZodDefault<z.ZodEnum<["awd_water_level", "weather_station", "multi_sensor"]>>;
    connection_type: z.ZodDefault<z.ZodEnum<["lorawan", "nb_iot", "gsm", "wifi", "manual"]>>;
    hardware_model: z.ZodOptional<z.ZodString>;
    serial_number: z.ZodOptional<z.ZodString>;
    firmware_version: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    device_code: string;
    device_type: "awd_water_level" | "weather_station" | "multi_sensor";
    connection_type: "lorawan" | "nb_iot" | "gsm" | "wifi" | "manual";
    notes?: string | undefined;
    hardware_model?: string | undefined;
    serial_number?: string | undefined;
    firmware_version?: string | undefined;
}, {
    device_code: string;
    notes?: string | undefined;
    device_type?: "awd_water_level" | "weather_station" | "multi_sensor" | undefined;
    connection_type?: "lorawan" | "nb_iot" | "gsm" | "wifi" | "manual" | undefined;
    hardware_model?: string | undefined;
    serial_number?: string | undefined;
    firmware_version?: string | undefined;
}>;
export declare const UpdateDeviceSchema: z.ZodObject<{
    device_code: z.ZodOptional<z.ZodString>;
    device_type: z.ZodOptional<z.ZodDefault<z.ZodEnum<["awd_water_level", "weather_station", "multi_sensor"]>>>;
    connection_type: z.ZodOptional<z.ZodDefault<z.ZodEnum<["lorawan", "nb_iot", "gsm", "wifi", "manual"]>>>;
    hardware_model: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    serial_number: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    firmware_version: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
    device_code?: string | undefined;
    device_type?: "awd_water_level" | "weather_station" | "multi_sensor" | undefined;
    connection_type?: "lorawan" | "nb_iot" | "gsm" | "wifi" | "manual" | undefined;
    hardware_model?: string | undefined;
    serial_number?: string | undefined;
    firmware_version?: string | undefined;
}, {
    notes?: string | undefined;
    device_code?: string | undefined;
    device_type?: "awd_water_level" | "weather_station" | "multi_sensor" | undefined;
    connection_type?: "lorawan" | "nb_iot" | "gsm" | "wifi" | "manual" | undefined;
    hardware_model?: string | undefined;
    serial_number?: string | undefined;
    firmware_version?: string | undefined;
}>;
export declare const AssignDeviceSchema: z.ZodObject<{
    sub_block_id: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sub_block_id: string;
    notes?: string | undefined;
}, {
    sub_block_id: string;
    notes?: string | undefined;
}>;
export declare const CalibrateDeviceSchema: z.ZodObject<{
    water_level_offset_cm: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    temperature_offset_c: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    humidity_offset_pct: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    valid_from: z.ZodOptional<z.ZodString>;
    valid_until: z.ZodOptional<z.ZodString>;
    calibration_method: z.ZodDefault<z.ZodEnum<["field_measurement", "lab_calibration", "manufacturer"]>>;
    reference_reading_cm: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    water_level_offset_cm: number;
    temperature_offset_c: number;
    humidity_offset_pct: number;
    calibration_method: "field_measurement" | "lab_calibration" | "manufacturer";
    notes?: string | undefined;
    valid_from?: string | undefined;
    valid_until?: string | undefined;
    reference_reading_cm?: number | undefined;
}, {
    notes?: string | undefined;
    valid_from?: string | undefined;
    valid_until?: string | undefined;
    water_level_offset_cm?: number | undefined;
    temperature_offset_c?: number | undefined;
    humidity_offset_pct?: number | undefined;
    calibration_method?: "field_measurement" | "lab_calibration" | "manufacturer" | undefined;
    reference_reading_cm?: number | undefined;
}>;
export declare const CreateFlowPathSchema: z.ZodObject<{
    from_sub_block_id: z.ZodString;
    to_sub_block_id: z.ZodString;
    flow_type: z.ZodDefault<z.ZodEnum<["natural", "pipe", "canal", "pump"]>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    from_sub_block_id: string;
    to_sub_block_id: string;
    flow_type: "natural" | "pipe" | "canal" | "pump";
    notes?: string | undefined;
}, {
    from_sub_block_id: string;
    to_sub_block_id: string;
    notes?: string | undefined;
    flow_type?: "natural" | "pipe" | "canal" | "pump" | undefined;
}>;
export declare const CreateCropCycleSchema: z.ZodObject<{
    bucket_code: z.ZodEnum<["early", "medium_early", "medium", "medium_late", "late"]>;
    variety_name: z.ZodOptional<z.ZodString>;
    rule_profile_id: z.ZodOptional<z.ZodString>;
    planting_date: z.ZodString;
    expected_harvest_date: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    bucket_code: "early" | "medium_early" | "medium" | "medium_late" | "late";
    planting_date: string;
    notes?: string | undefined;
    variety_name?: string | undefined;
    rule_profile_id?: string | undefined;
    expected_harvest_date?: string | undefined;
}, {
    bucket_code: "early" | "medium_early" | "medium" | "medium_late" | "late";
    planting_date: string;
    notes?: string | undefined;
    variety_name?: string | undefined;
    rule_profile_id?: string | undefined;
    expected_harvest_date?: string | undefined;
}>;
export declare const UpdateCropCyclePhaseSchema: z.ZodObject<{
    current_phase_code: z.ZodEnum<["land_prep", "nursery", "transplanting", "vegetative_early", "vegetative_late", "reproductive", "ripening", "harvesting", "harvested"]>;
    rule_profile_id: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    current_phase_code: "land_prep" | "nursery" | "transplanting" | "vegetative_early" | "vegetative_late" | "reproductive" | "ripening" | "harvesting" | "harvested";
    notes?: string | undefined;
    rule_profile_id?: string | undefined;
}, {
    current_phase_code: "land_prep" | "nursery" | "transplanting" | "vegetative_early" | "vegetative_late" | "reproductive" | "ripening" | "harvesting" | "harvested";
    notes?: string | undefined;
    rule_profile_id?: string | undefined;
}>;
export declare const CreateRuleProfileSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    bucket_code: z.ZodString;
    phase_code: z.ZodString;
    awd_lower_threshold_cm: z.ZodNumber;
    awd_upper_target_cm: z.ZodNumber;
    drought_alert_cm: z.ZodOptional<z.ZodNumber>;
    min_saturation_days: z.ZodDefault<z.ZodNumber>;
    rain_delay_mm: z.ZodDefault<z.ZodNumber>;
    priority_weight: z.ZodDefault<z.ZodNumber>;
    rainfed_modifier_pct: z.ZodDefault<z.ZodNumber>;
    target_confidence: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
    is_default: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    bucket_code: string;
    name: string;
    phase_code: string;
    awd_lower_threshold_cm: number;
    awd_upper_target_cm: number;
    min_saturation_days: number;
    rainfed_modifier_pct: number;
    priority_weight: number;
    rain_delay_mm: number;
    target_confidence: "high" | "medium" | "low";
    is_default: boolean;
    description?: string | undefined;
    drought_alert_cm?: number | undefined;
}, {
    bucket_code: string;
    name: string;
    phase_code: string;
    awd_lower_threshold_cm: number;
    awd_upper_target_cm: number;
    description?: string | undefined;
    drought_alert_cm?: number | undefined;
    min_saturation_days?: number | undefined;
    rainfed_modifier_pct?: number | undefined;
    priority_weight?: number | undefined;
    rain_delay_mm?: number | undefined;
    target_confidence?: "high" | "medium" | "low" | undefined;
    is_default?: boolean | undefined;
}>;
export declare const UpdateRuleProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    bucket_code: z.ZodOptional<z.ZodString>;
    phase_code: z.ZodOptional<z.ZodString>;
    awd_lower_threshold_cm: z.ZodOptional<z.ZodNumber>;
    awd_upper_target_cm: z.ZodOptional<z.ZodNumber>;
    drought_alert_cm: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    min_saturation_days: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    rain_delay_mm: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    priority_weight: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    rainfed_modifier_pct: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    target_confidence: z.ZodOptional<z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>>;
    is_default: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    bucket_code?: string | undefined;
    description?: string | undefined;
    name?: string | undefined;
    phase_code?: string | undefined;
    awd_lower_threshold_cm?: number | undefined;
    awd_upper_target_cm?: number | undefined;
    drought_alert_cm?: number | undefined;
    min_saturation_days?: number | undefined;
    rainfed_modifier_pct?: number | undefined;
    priority_weight?: number | undefined;
    rain_delay_mm?: number | undefined;
    target_confidence?: "high" | "medium" | "low" | undefined;
    is_default?: boolean | undefined;
}, {
    bucket_code?: string | undefined;
    description?: string | undefined;
    name?: string | undefined;
    phase_code?: string | undefined;
    awd_lower_threshold_cm?: number | undefined;
    awd_upper_target_cm?: number | undefined;
    drought_alert_cm?: number | undefined;
    min_saturation_days?: number | undefined;
    rainfed_modifier_pct?: number | undefined;
    priority_weight?: number | undefined;
    rain_delay_mm?: number | undefined;
    target_confidence?: "high" | "medium" | "low" | undefined;
    is_default?: boolean | undefined;
}>;
//# sourceMappingURL=master-data.schema.d.ts.map