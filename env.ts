import { z } from 'zod'

const envSchema = z.object({
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.string().transform(Number).default('5432'),
  POSTGRES_USER: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_CA: z.string(),
  DATABASE_URL: z.string(),
  EMAIL_SMTP_HOST: z.string(),
  EMAIL_SMTP_PORT: z.string().transform(Number).default('1025'),
  EMAIL_SMTP_USER: z.string(),
  EMAIL_SMTP_PASSWORD: z.string(),
  EMAIL_HTTP_HOST: z.string(),
  EMAIL_HTTP_PORT: z.string().transform(Number).default('10280'),
})

export const env = envSchema.parse(process.env)
