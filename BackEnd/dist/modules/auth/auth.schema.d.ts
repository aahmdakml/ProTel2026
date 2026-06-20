import { z } from 'zod';
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const RefreshSchema: z.ZodObject<{
    refresh_token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refresh_token: string;
}, {
    refresh_token: string;
}>;
export declare const TokenResponseSchema: z.ZodObject<{
    access_token: z.ZodString;
    refresh_token: z.ZodString;
    token_type: z.ZodLiteral<"Bearer">;
    expires_in: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    refresh_token: string;
    access_token: string;
    token_type: "Bearer";
    expires_in: number;
}, {
    refresh_token: string;
    access_token: string;
    token_type: "Bearer";
    expires_in: number;
}>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
//# sourceMappingURL=auth.schema.d.ts.map