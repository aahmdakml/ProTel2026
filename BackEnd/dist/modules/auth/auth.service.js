"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../../db/client");
const mst_1 = require("../../db/schema/mst");
const schema_1 = require("../../db/schema");
const schema_2 = require("../../db/schema");
const config_1 = require("../../config");
const crypto_util_1 = require("../../shared/utils/crypto.util");
const time_util_1 = require("../../shared/utils/time.util");
const error_middleware_1 = require("../../middleware/error.middleware");
const logger_util_1 = require("../../shared/utils/logger.util");
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
async function issueTokens(userId, role) {
    // 1. Sign JWT access token (15m default)
    const payload = { sub: userId, role };
    const access_token = jsonwebtoken_1.default.sign(payload, config_1.config.JWT_SECRET, {
        expiresIn: config_1.config.JWT_ACCESS_EXPIRES_IN,
    });
    // 2. Generate opaque refresh token (48 random bytes → base64url)
    const rawRefresh = (0, crypto_util_1.generateToken)(48);
    const tokenHash = (0, crypto_util_1.sha256)(rawRefresh);
    const expiresAt = new Date(Date.now() + (0, time_util_1.parseExpiryMs)(config_1.config.JWT_REFRESH_EXPIRES_IN));
    // 3. Store SHA-256 hash in DB (never store raw token)
    await client_1.db.insert(schema_1.refreshTokens).values({
        userId,
        tokenHash,
        expiresAt,
        revoked: false,
    });
    return {
        access_token,
        refresh_token: rawRefresh,
        token_type: 'Bearer',
        expires_in: (0, time_util_1.parseExpirySec)(config_1.config.JWT_ACCESS_EXPIRES_IN),
    };
}
/** Log auth events — jangan crash kalau logging gagal */
async function logAuth(event) {
    try {
        await client_1.db.insert(schema_2.authLogs).values({
            userId: event.userId,
            eventType: event.eventType,
            success: event.success,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            notes: event.notes,
        });
    }
    catch (err) {
        logger_util_1.logger.warn({ err }, 'Failed to write auth log');
    }
}
// ---------------------------------------------------------------------------
// Auth service
// ---------------------------------------------------------------------------
exports.authService = {
    // ── POST /auth/login ──────────────────────────────────────────────────────
    async login(input, meta) {
        const email = input.email.toLowerCase().trim();
        // 1. Find user (hati2: jangan bedain "email tidak ada" vs "password salah")
        const [user] = await client_1.db
            .select()
            .from(mst_1.users)
            .where((0, drizzle_orm_1.eq)(mst_1.users.email, email))
            .limit(1);
        if (!user || !user.isActive) {
            await logAuth({
                eventType: 'LOGIN_FAILED',
                success: false,
                ipAddress: meta?.ip,
                notes: user ? 'User inactive' : 'Email not found',
            });
            // Pesan sama untuk cegah user enumeration
            throw new error_middleware_1.AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
        }
        // 2. Constant-time password comparison
        const isValid = await bcryptjs_1.default.compare(input.password, user.passwordHash);
        if (!isValid) {
            await logAuth({
                userId: user.id,
                eventType: 'LOGIN_FAILED',
                success: false,
                ipAddress: meta?.ip,
                notes: 'Wrong password',
            });
            throw new error_middleware_1.AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
        }
        // 3. Update last_login_at
        await client_1.db
            .update(mst_1.users)
            .set({ lastLoginAt: new Date() })
            .where((0, drizzle_orm_1.eq)(mst_1.users.id, user.id));
        // 4. Issue tokens
        const tokens = await issueTokens(user.id, user.systemRole);
        await logAuth({
            userId: user.id,
            eventType: 'LOGIN_SUCCESS',
            success: true,
            ipAddress: meta?.ip,
            userAgent: meta?.userAgent,
        });
        return tokens;
    },
    // ── POST /auth/refresh ────────────────────────────────────────────────────
    async refresh(rawToken) {
        const tokenHash = (0, crypto_util_1.sha256)(rawToken);
        const now = new Date();
        // 1. Lookup token by hash
        const [tokenRow] = await client_1.db
            .select()
            .from(schema_1.refreshTokens)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.refreshTokens.tokenHash, tokenHash), (0, drizzle_orm_1.eq)(schema_1.refreshTokens.revoked, false)))
            .limit(1);
        if (!tokenRow) {
            throw new error_middleware_1.AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token tidak valid atau sudah digunakan');
        }
        if (tokenRow.expiresAt < now) {
            throw new error_middleware_1.AppError(401, 'REFRESH_TOKEN_EXPIRED', 'Sesi habis, silakan login ulang');
        }
        // 2. Get user
        const [user] = await client_1.db
            .select({
            id: mst_1.users.id,
            systemRole: mst_1.users.systemRole,
            isActive: mst_1.users.isActive,
        })
            .from(mst_1.users)
            .where((0, drizzle_orm_1.eq)(mst_1.users.id, tokenRow.userId))
            .limit(1);
        if (!user || !user.isActive) {
            throw new error_middleware_1.AppError(401, 'USER_INACTIVE', 'Akun tidak aktif');
        }
        // 3. Re-issue access token (refresh token rotation bisa ditambahkan nanti)
        const payload = { sub: user.id, role: user.systemRole };
        const access_token = jsonwebtoken_1.default.sign(payload, config_1.config.JWT_SECRET, {
            expiresIn: config_1.config.JWT_ACCESS_EXPIRES_IN,
        });
        return {
            access_token,
            token_type: 'Bearer',
            expires_in: (0, time_util_1.parseExpirySec)(config_1.config.JWT_ACCESS_EXPIRES_IN),
        };
    },
    // ── POST /auth/logout ─────────────────────────────────────────────────────
    async logout(rawToken) {
        const tokenHash = (0, crypto_util_1.sha256)(rawToken);
        // Revoke token — jika tidak ada / sudah revoked, tidak masalah
        await client_1.db
            .update(schema_1.refreshTokens)
            .set({ revoked: true, revokedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.refreshTokens.tokenHash, tokenHash));
    },
    // ── GET /auth/me ──────────────────────────────────────────────────────────
    async getMe(userId) {
        const [user] = await client_1.db
            .select({
            id: mst_1.users.id,
            email: mst_1.users.email,
            fullName: mst_1.users.fullName,
            systemRole: mst_1.users.systemRole,
            isActive: mst_1.users.isActive,
            lastLoginAt: mst_1.users.lastLoginAt,
            createdAt: mst_1.users.createdAt,
        })
            .from(mst_1.users)
            .where((0, drizzle_orm_1.eq)(mst_1.users.id, userId))
            .limit(1);
        if (!user) {
            throw new error_middleware_1.AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan');
        }
        return user;
    },
};
//# sourceMappingURL=auth.service.js.map