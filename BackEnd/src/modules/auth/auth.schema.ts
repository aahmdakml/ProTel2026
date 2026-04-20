import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request body schemas
// ---------------------------------------------------------------------------

export const LoginSchema = z.object({
  email:    z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const RefreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token diperlukan'),
});

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export const TokenResponseSchema = z.object({
  access_token:  z.string(),
  refresh_token: z.string(),
  token_type:    z.literal('Bearer'),
  expires_in:    z.number(), // seconds
});

export type LoginInput     = z.infer<typeof LoginSchema>;
export type RefreshInput   = z.infer<typeof RefreshSchema>;
export type TokenResponse  = z.infer<typeof TokenResponseSchema>;
