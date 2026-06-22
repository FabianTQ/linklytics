import { z } from 'zod';

/**
 * Boolean-ish parser: env vars are strings, and `z.coerce.boolean()` treats any
 * non-empty string (including "false") as `true`. This parses explicitly.
 */
const booleanish = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  return false;
}, z.boolean());

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),

  COOKIE_NAME: z.string().default('linklytics_session'),
  COOKIE_SECURE: booleanish.default(false),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  SHORT_BASE_URL: z.string().url().default('http://localhost:3001/r'),

  RATE_LIMIT_CREATE_PER_MIN: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_REDIRECT_PER_MIN: z.coerce.number().int().positive().default(120),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Used by `ConfigModule.forRoot({ validate })` — fails fast at boot with a
 * readable message listing every invalid variable.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
