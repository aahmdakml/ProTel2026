import type { LoginInput, TokenResponse } from './auth.schema';
export declare const authService: {
    login(input: LoginInput, meta?: {
        ip?: string;
        userAgent?: string;
    }): Promise<TokenResponse>;
    refresh(rawToken: string): Promise<Pick<TokenResponse, "access_token" | "token_type" | "expires_in">>;
    logout(rawToken: string): Promise<void>;
    getMe(userId: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        systemRole: string;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
    }>;
};
//# sourceMappingURL=auth.service.d.ts.map