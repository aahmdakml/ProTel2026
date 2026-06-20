"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geometry = exports.geometryPolygon = exports.geometryPoint = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// ---------------------------------------------------------------------------
// Custom PostGIS geometry types untuk Drizzle ORM
// Drizzle tidak punya native PostGIS support — definisikan sebagai customType
// Value disimpan sebagai string (GeoJSON atau WKT) dari PostgreSQL
// ---------------------------------------------------------------------------
/** Geometry POINT dengan SRID 4326 (WGS84) */
exports.geometryPoint = (0, pg_core_1.customType)({
    dataType() {
        return 'text';
    },
    fromDriver: (v) => v,
    toDriver: (v) => v,
});
/** Geometry POLYGON dengan SRID 4326 (WGS84) */
exports.geometryPolygon = (0, pg_core_1.customType)({
    dataType() {
        return 'text';
    },
    fromDriver: (v) => v,
    toDriver: (v) => v,
});
/** Generic GEOMETRY (untuk bounds/area) */
exports.geometry = (0, pg_core_1.customType)({
    dataType() {
        return 'text';
    },
    fromDriver: (v) => v,
    toDriver: (v) => v,
});
//# sourceMappingURL=geometry.js.map