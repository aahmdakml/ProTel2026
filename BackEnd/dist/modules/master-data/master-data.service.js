"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ruleProfilesService = exports.cropCyclesService = exports.flowPathsService = exports.devicesService = exports.subBlocksService = exports.fieldsService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const mst_1 = require("../../db/schema/mst");
const error_middleware_1 = require("../../middleware/error.middleware");
const pagination_util_1 = require("../../shared/utils/pagination.util");
// ===========================================================================
// FIELDS
// ===========================================================================
exports.fieldsService = {
    async list(userId, isAdmin, query) {
        const { page, limit, offset } = (0, pagination_util_1.parsePagination)(query);
        // Admin melihat semua field; user lain hanya yang punya akses
        let rows;
        let total = 0;
        if (isAdmin) {
            [rows, [{ value: total }]] = await Promise.all([
                client_1.db.select().from(mst_1.fields).where((0, drizzle_orm_1.eq)(mst_1.fields.isActive, true))
                    .orderBy(mst_1.fields.name).limit(limit).offset(offset),
                client_1.db.select({ value: (0, drizzle_orm_1.count)() }).from(mst_1.fields).where((0, drizzle_orm_1.eq)(mst_1.fields.isActive, true)),
            ]);
        }
        else {
            const userFieldsSubQuery = client_1.db
                .select({ fieldId: mst_1.userFields.fieldId })
                .from(mst_1.userFields)
                .where((0, drizzle_orm_1.eq)(mst_1.userFields.userId, userId));
            [rows, [{ value: total }]] = await Promise.all([
                client_1.db.select().from(mst_1.fields)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.fields.isActive, true), (0, drizzle_orm_1.sql) `${mst_1.fields.id} IN (${userFieldsSubQuery})`))
                    .orderBy(mst_1.fields.name).limit(limit).offset(offset),
                client_1.db.select({ value: (0, drizzle_orm_1.count)() }).from(mst_1.fields)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.fields.isActive, true), (0, drizzle_orm_1.sql) `${mst_1.fields.id} IN (${userFieldsSubQuery})`)),
            ]);
        }
        return { rows, meta: (0, pagination_util_1.buildPaginationMeta)({ page, limit, offset }, total) };
    },
    async getById(fieldId) {
        const [field] = await client_1.db
            .select()
            .from(mst_1.fields)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.fields.id, fieldId), (0, drizzle_orm_1.eq)(mst_1.fields.isActive, true)))
            .limit(1);
        if (!field)
            throw new error_middleware_1.AppError(404, 'FIELD_NOT_FOUND', 'Field tidak ditemukan');
        return field;
    },
    async create(input, createdByUserId) {
        const [field] = await client_1.db
            .insert(mst_1.fields)
            .values({
            name: input.name,
            description: input.description,
            adm4Code: input.adm4_code,
            waterSourceType: input.water_source_type,
            areaHectares: input.area_hectares?.toString(),
            operatorCountDefault: input.operator_count_default,
            decisionCycleMode: input.decision_cycle_mode,
            notes: input.notes,
        })
            .returning();
        // Auto-grant manager access to creator (jika bukan system_admin)
        await client_1.db.insert(mst_1.userFields).values({
            userId: createdByUserId,
            fieldId: field.id,
            fieldRole: 'manager',
            grantedBy: createdByUserId,
        }).onConflictDoNothing();
        return field;
    },
    async update(fieldId, input) {
        const [updated] = await client_1.db
            .update(mst_1.fields)
            .set({
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.adm4_code !== undefined && { adm4Code: input.adm4_code }),
            ...(input.water_source_type !== undefined && { waterSourceType: input.water_source_type }),
            ...(input.area_hectares !== undefined && { areaHectares: input.area_hectares.toString() }),
            ...(input.operator_count_default !== undefined && { operatorCountDefault: input.operator_count_default }),
            ...(input.decision_cycle_mode !== undefined && { decisionCycleMode: input.decision_cycle_mode }),
            ...(input.notes !== undefined && { notes: input.notes }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(mst_1.fields.id, fieldId))
            .returning();
        if (!updated)
            throw new error_middleware_1.AppError(404, 'FIELD_NOT_FOUND', 'Field tidak ditemukan');
        return updated;
    },
    async assignUser(fieldId, input, grantedBy) {
        // Cek user exists
        const [user] = await client_1.db.select({ id: mst_1.users.id })
            .from(mst_1.users).where((0, drizzle_orm_1.eq)(mst_1.users.id, input.user_id)).limit(1);
        if (!user)
            throw new error_middleware_1.AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan');
        await client_1.db.insert(mst_1.userFields)
            .values({
            userId: input.user_id,
            fieldId,
            fieldRole: input.field_role,
            grantedBy,
        })
            .onConflictDoUpdate({
            target: [mst_1.userFields.userId, mst_1.userFields.fieldId],
            set: { fieldRole: input.field_role, grantedBy, grantedAt: new Date() },
        });
    },
    async revokeUser(fieldId, userId) {
        await client_1.db.delete(mst_1.userFields)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.userFields.fieldId, fieldId), (0, drizzle_orm_1.eq)(mst_1.userFields.userId, userId)));
    },
    async delete(fieldId) {
        await client_1.db.update(mst_1.fields)
            .set({ isActive: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(mst_1.fields.id, fieldId));
    },
};
// ===========================================================================
// SUB-BLOCKS
// ===========================================================================
exports.subBlocksService = {
    async listByField(fieldId) {
        return client_1.db.select()
            .from(mst_1.subBlocks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.subBlocks.fieldId, fieldId), (0, drizzle_orm_1.eq)(mst_1.subBlocks.isActive, true)))
            .orderBy(mst_1.subBlocks.displayOrder, mst_1.subBlocks.name);
    },
    async getById(subBlockId) {
        const [sb] = await client_1.db.select().from(mst_1.subBlocks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.subBlocks.id, subBlockId), (0, drizzle_orm_1.eq)(mst_1.subBlocks.isActive, true)))
            .limit(1);
        if (!sb)
            throw new error_middleware_1.AppError(404, 'SUB_BLOCK_NOT_FOUND', 'Sub-block tidak ditemukan');
        return sb;
    },
    async create(fieldId, input) {
        const geomJson = JSON.stringify(input.polygon_geom);
        const [inserted] = await client_1.db.insert(mst_1.subBlocks).values({
            fieldId,
            name: input.name,
            code: input.code,
            polygonGeom: geomJson,
            elevationM: input.elevation_m?.toString(),
            soilType: input.soil_type,
            displayOrder: input.display_order,
            notes: input.notes,
        }).returning();
        if (!inserted)
            throw new error_middleware_1.AppError(500, 'CREATE_FAILED', 'Gagal membuat sub-block');
        return inserted;
    },
    async update(subBlockId, input) {
        const setParts = { updatedAt: new Date() };
        if (input.name !== undefined)
            setParts['name'] = input.name;
        if (input.code !== undefined)
            setParts['code'] = input.code;
        if (input.elevation_m !== undefined)
            setParts['elevationM'] = input.elevation_m;
        if (input.soil_type !== undefined)
            setParts['soilType'] = input.soil_type;
        if (input.display_order !== undefined)
            setParts['displayOrder'] = input.display_order;
        if (input.notes !== undefined)
            setParts['notes'] = input.notes;
        if (input.polygon_geom !== undefined)
            setParts['polygonGeom'] = JSON.stringify(input.polygon_geom);
        const [updated] = await client_1.db.update(mst_1.subBlocks)
            .set(setParts)
            .where((0, drizzle_orm_1.eq)(mst_1.subBlocks.id, subBlockId))
            .returning();
        if (!updated)
            throw new error_middleware_1.AppError(404, 'SUB_BLOCK_NOT_FOUND', 'Sub-block tidak ditemukan');
        return updated;
    },
    /** Bulk import dari GeoJSON FeatureCollection */
    async importFromGeoJson(fieldId, input) {
        const insertedIds = [];
        for (const feature of input.geojson.features) {
            const props = feature.properties ?? {};
            const name = String(props[input.name_field] ?? `Sub-block ${insertedIds.length + 1}`);
            const code = input.code_field ? String(props[input.code_field] ?? '') : undefined;
            const geomJson = JSON.stringify(feature.geometry);
            const [inserted] = await client_1.db.insert(mst_1.subBlocks).values({
                fieldId,
                name,
                code,
                polygonGeom: geomJson,
            }).returning();
            if (inserted)
                insertedIds.push(inserted.id);
        }
        return { inserted: insertedIds.length, ids: insertedIds };
    },
    async delete(subBlockId) {
        await client_1.db.update(mst_1.subBlocks)
            .set({ isActive: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(mst_1.subBlocks.id, subBlockId));
    },
};
// ===========================================================================
// DEVICES
// ===========================================================================
exports.devicesService = {
    async listByField(fieldId) {
        return client_1.db.select().from(mst_1.devices)
            .where((0, drizzle_orm_1.eq)(mst_1.devices.fieldId, fieldId))
            .orderBy(mst_1.devices.deviceCode);
    },
    async getById(deviceId) {
        const [dev] = await client_1.db.select().from(mst_1.devices)
            .where((0, drizzle_orm_1.eq)(mst_1.devices.id, deviceId)).limit(1);
        if (!dev)
            throw new error_middleware_1.AppError(404, 'DEVICE_NOT_FOUND', 'Device tidak ditemukan');
        return dev;
    },
    async create(fieldId, input) {
        const [dev] = await client_1.db.insert(mst_1.devices).values({
            deviceCode: input.device_code,
            deviceType: input.device_type,
            connectionType: input.connection_type,
            hardwareModel: input.hardware_model,
            serialNumber: input.serial_number,
            firmwareVersion: input.firmware_version,
            fieldId,
            status: 'active',
            notes: input.notes,
        }).returning();
        return dev;
    },
    async update(deviceId, input) {
        const [updated] = await client_1.db.update(mst_1.devices)
            .set({
            ...(input.device_type !== undefined && { deviceType: input.device_type }),
            ...(input.connection_type !== undefined && { connectionType: input.connection_type }),
            ...(input.hardware_model !== undefined && { hardwareModel: input.hardware_model }),
            ...(input.firmware_version !== undefined && { firmwareVersion: input.firmware_version }),
            ...(input.notes !== undefined && { notes: input.notes }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(mst_1.devices.id, deviceId))
            .returning();
        if (!updated)
            throw new error_middleware_1.AppError(404, 'DEVICE_NOT_FOUND', 'Device tidak ditemukan');
        return updated;
    },
    async assign(deviceId, fieldId, input, assignedBy) {
        // Pastikan sub-block ada dan di field yang sama
        const [sb] = await client_1.db.select({ id: mst_1.subBlocks.id, fieldId: mst_1.subBlocks.fieldId })
            .from(mst_1.subBlocks).where((0, drizzle_orm_1.eq)(mst_1.subBlocks.id, input.sub_block_id)).limit(1);
        if (!sb)
            throw new error_middleware_1.AppError(404, 'SUB_BLOCK_NOT_FOUND', 'Sub-block tidak ditemukan');
        if (sb.fieldId !== fieldId)
            throw new error_middleware_1.AppError(400, 'FIELD_MISMATCH', 'Sub-block bukan milik field ini');
        // Close existing assignment jika ada
        await client_1.db.update(mst_1.deviceAssignments)
            .set({ unassignedAt: new Date(), unassignedBy: assignedBy })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.deviceAssignments.deviceId, deviceId), (0, drizzle_orm_1.sql) `${mst_1.deviceAssignments.unassignedAt} IS NULL`));
        // Create new assignment
        await client_1.db.insert(mst_1.deviceAssignments).values({
            deviceId, subBlockId: input.sub_block_id, fieldId, assignedBy, notes: input.notes,
        });
        // Update device.sub_block_id untuk quick lookup
        await client_1.db.update(mst_1.devices)
            .set({ subBlockId: input.sub_block_id, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(mst_1.devices.id, deviceId));
    },
    async unassign(deviceId, unassignedBy) {
        await client_1.db.update(mst_1.deviceAssignments)
            .set({ unassignedAt: new Date(), unassignedBy })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.deviceAssignments.deviceId, deviceId), (0, drizzle_orm_1.sql) `${mst_1.deviceAssignments.unassignedAt} IS NULL`));
        await client_1.db.update(mst_1.devices)
            .set({ subBlockId: null, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(mst_1.devices.id, deviceId));
    },
    async calibrate(deviceId, input, calibratedBy) {
        // Expire previous active calibration jika ada
        await client_1.db.update(mst_1.sensorCalibrations)
            .set({ validUntil: new Date(), isActive: false })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.sensorCalibrations.deviceId, deviceId), (0, drizzle_orm_1.eq)(mst_1.sensorCalibrations.isActive, true), (0, drizzle_orm_1.sql) `${mst_1.sensorCalibrations.validUntil} IS NULL`));
        const [cal] = await client_1.db.insert(mst_1.sensorCalibrations).values({
            deviceId,
            waterLevelOffsetCm: input.water_level_offset_cm?.toString() ?? '0.00',
            temperatureOffsetC: input.temperature_offset_c?.toString() ?? '0.00',
            humidityOffsetPct: input.humidity_offset_pct?.toString() ?? '0.00',
            validFrom: input.valid_from ? new Date(input.valid_from) : new Date(),
            validUntil: input.valid_until ? new Date(input.valid_until) : undefined,
            calibrationMethod: input.calibration_method,
            referenceReadingCm: input.reference_reading_cm?.toString(),
            calibratedBy,
            notes: input.notes,
            isActive: true,
        }).returning();
        return cal;
    },
    async delete(deviceId) {
        await client_1.db.delete(mst_1.devices).where((0, drizzle_orm_1.eq)(mst_1.devices.id, deviceId));
    },
};
// ===========================================================================
// FLOW PATHS
// ===========================================================================
exports.flowPathsService = {
    async listByField(fieldId) {
        return client_1.db.select().from(mst_1.flowPaths)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${mst_1.flowPaths.fromSubBlockId} IN (
          SELECT id FROM mst.sub_blocks WHERE field_id = ${fieldId}
        )`, (0, drizzle_orm_1.eq)(mst_1.flowPaths.isActive, true)));
    },
    async create(fieldId, input) {
        // Validasi kedua sub-block ada dan milik field ini
        const [from] = await client_1.db.select({ fieldId: mst_1.subBlocks.fieldId })
            .from(mst_1.subBlocks).where((0, drizzle_orm_1.eq)(mst_1.subBlocks.id, input.from_sub_block_id)).limit(1);
        const [to] = await client_1.db.select({ fieldId: mst_1.subBlocks.fieldId })
            .from(mst_1.subBlocks).where((0, drizzle_orm_1.eq)(mst_1.subBlocks.id, input.to_sub_block_id)).limit(1);
        if (!from || from.fieldId !== fieldId)
            throw new error_middleware_1.AppError(400, 'INVALID_FROM_SUB_BLOCK', 'from_sub_block_id tidak valid');
        if (!to || to.fieldId !== fieldId)
            throw new error_middleware_1.AppError(400, 'INVALID_TO_SUB_BLOCK', 'to_sub_block_id tidak valid');
        const [fp] = await client_1.db.insert(mst_1.flowPaths).values({
            fromSubBlockId: input.from_sub_block_id,
            toSubBlockId: input.to_sub_block_id,
            flowType: input.flow_type,
            notes: input.notes,
        }).returning();
        return fp;
    },
    async delete(flowPathId) {
        await client_1.db.update(mst_1.flowPaths)
            .set({ isActive: false })
            .where((0, drizzle_orm_1.eq)(mst_1.flowPaths.id, flowPathId));
    },
};
// ===========================================================================
// CROP CYCLES
// ===========================================================================
exports.cropCyclesService = {
    async listBySubBlock(subBlockId) {
        return client_1.db.select().from(mst_1.cropCycles)
            .where((0, drizzle_orm_1.eq)(mst_1.cropCycles.subBlockId, subBlockId))
            .orderBy((0, drizzle_orm_1.desc)(mst_1.cropCycles.createdAt));
    },
    async getActive(subBlockId) {
        const [cc] = await client_1.db.select().from(mst_1.cropCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(mst_1.cropCycles.subBlockId, subBlockId), (0, drizzle_orm_1.eq)(mst_1.cropCycles.status, 'active')))
            .limit(1);
        return cc ?? null;
    },
    async create(subBlockId, fieldId, input) {
        // Tidak boleh ada crop cycle aktif pada sub-block yang sama
        const existing = await this.getActive(subBlockId);
        if (existing)
            throw new error_middleware_1.AppError(409, 'CROP_CYCLE_ACTIVE', 'Sub-block ini sudah memiliki crop cycle yang aktif');
        const [cc] = await client_1.db.insert(mst_1.cropCycles).values({
            subBlockId,
            fieldId,
            bucketCode: input.bucket_code,
            varietyName: input.variety_name,
            ruleProfileId: input.rule_profile_id,
            plantingDate: input.planting_date,
            expectedHarvestDate: input.expected_harvest_date,
            currentPhaseCode: 'land_prep',
            currentHst: 0,
            status: 'active',
            notes: input.notes,
        }).returning();
        return cc;
    },
    async advancePhase(cropCycleId, input) {
        const [cc] = await client_1.db.select().from(mst_1.cropCycles)
            .where((0, drizzle_orm_1.eq)(mst_1.cropCycles.id, cropCycleId)).limit(1);
        if (!cc)
            throw new error_middleware_1.AppError(404, 'CROP_CYCLE_NOT_FOUND', 'Crop cycle tidak ditemukan');
        if (cc.status !== 'active')
            throw new error_middleware_1.AppError(400, 'CROP_CYCLE_NOT_ACTIVE', 'Crop cycle tidak aktif');
        const [updated] = await client_1.db.update(mst_1.cropCycles)
            .set({
            currentPhaseCode: input.current_phase_code,
            ...(input.rule_profile_id !== undefined && { ruleProfileId: input.rule_profile_id }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(mst_1.cropCycles.id, cropCycleId))
            .returning();
        return updated;
    },
    async complete(cropCycleId, actualHarvestDate) {
        const [updated] = await client_1.db.update(mst_1.cropCycles)
            .set({
            status: 'completed',
            currentPhaseCode: 'harvested',
            actualHarvestDate: actualHarvestDate,
            completedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(mst_1.cropCycles.id, cropCycleId))
            .returning();
        if (!updated)
            throw new error_middleware_1.AppError(404, 'CROP_CYCLE_NOT_FOUND', 'Crop cycle tidak ditemukan');
        return updated;
    },
    async getById(id) {
        const [cc] = await client_1.db.select().from(mst_1.cropCycles).where((0, drizzle_orm_1.eq)(mst_1.cropCycles.id, id)).limit(1);
        if (!cc)
            throw new error_middleware_1.AppError(404, 'CROP_CYCLE_NOT_FOUND', 'Crop cycle tidak ditemukan');
        return cc;
    },
    async delete(id) {
        await client_1.db.delete(mst_1.cropCycles).where((0, drizzle_orm_1.eq)(mst_1.cropCycles.id, id));
    },
};
// ===========================================================================
// RULE PROFILES
// ===========================================================================
exports.ruleProfilesService = {
    async list(query) {
        const { page, limit, offset } = (0, pagination_util_1.parsePagination)(query);
        const [rows, [{ value: total }]] = await Promise.all([
            client_1.db.select().from(mst_1.irrigationRuleProfiles)
                .where((0, drizzle_orm_1.eq)(mst_1.irrigationRuleProfiles.isActive, true))
                .orderBy(mst_1.irrigationRuleProfiles.name).limit(limit).offset(offset),
            client_1.db.select({ value: (0, drizzle_orm_1.count)() }).from(mst_1.irrigationRuleProfiles)
                .where((0, drizzle_orm_1.eq)(mst_1.irrigationRuleProfiles.isActive, true)),
        ]);
        return { rows, meta: (0, pagination_util_1.buildPaginationMeta)({ page, limit, offset }, total) };
    },
    async create(input, createdBy) {
        const [profile] = await client_1.db.insert(mst_1.irrigationRuleProfiles).values({
            name: input.name,
            description: input.description,
            bucketCode: input.bucket_code,
            phaseCode: input.phase_code,
            awdLowerThresholdCm: input.awd_lower_threshold_cm.toString(),
            awdUpperTargetCm: input.awd_upper_target_cm.toString(),
            droughtAlertCm: input.drought_alert_cm?.toString(),
            minSaturationDays: input.min_saturation_days,
            rainDelayMm: input.rain_delay_mm.toString(),
            priorityWeight: input.priority_weight.toString(),
            rainfedModifierPct: input.rainfed_modifier_pct.toString(),
            targetConfidence: input.target_confidence,
            isDefault: input.is_default,
            createdBy,
        }).returning();
        return profile;
    },
    async getById(id) {
        const [profile] = await client_1.db.select().from(mst_1.irrigationRuleProfiles).where((0, drizzle_orm_1.eq)(mst_1.irrigationRuleProfiles.id, id)).limit(1);
        if (!profile)
            throw new error_middleware_1.AppError(404, 'RULE_PROFILE_NOT_FOUND', 'Profil aturan tidak ditemukan');
        return profile;
    },
    async update(id, input) {
        const [updated] = await client_1.db.update(mst_1.irrigationRuleProfiles)
            .set({
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.bucket_code !== undefined && { bucketCode: input.bucket_code }),
            ...(input.phase_code !== undefined && { phaseCode: input.phase_code }),
            ...(input.awd_lower_threshold_cm !== undefined && { awdLowerThresholdCm: input.awd_lower_threshold_cm.toString() }),
            ...(input.awd_upper_target_cm !== undefined && { awdUpperTargetCm: input.awd_upper_target_cm.toString() }),
            ...(input.drought_alert_cm !== undefined && { droughtAlertCm: input.drought_alert_cm?.toString() }),
            ...(input.min_saturation_days !== undefined && { minSaturationDays: input.min_saturation_days }),
            ...(input.rain_delay_mm !== undefined && { rainDelayMm: input.rain_delay_mm.toString() }),
            ...(input.priority_weight !== undefined && { priorityWeight: input.priority_weight.toString() }),
            ...(input.rainfed_modifier_pct !== undefined && { rainfedModifierPct: input.rainfed_modifier_pct.toString() }),
            ...(input.target_confidence !== undefined && { targetConfidence: input.target_confidence }),
            ...(input.is_default !== undefined && { isDefault: input.is_default }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(mst_1.irrigationRuleProfiles.id, id))
            .returning();
        return updated;
    },
    async delete(id) {
        await client_1.db.update(mst_1.irrigationRuleProfiles)
            .set({ isActive: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(mst_1.irrigationRuleProfiles.id, id));
    },
};
//# sourceMappingURL=master-data.service.js.map