import 'dotenv/config';
import { cleanEnv, num, port, str } from 'envalid';

/**
 * Typed environment validation.
 *
 * The process refuses to boot when a *required* variable is missing or
 * malformed — envalid throws during this module's evaluation, before any
 * server/database code runs. Required variables have no default; stubbed
 * integrations (AWS, SMTP, Razorpay) default to empty strings until their
 * respective backend steps land.
 */
export const env = cleanEnv(process.env, {
  // Server
  NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
  PORT: port(),

  // PostgreSQL (Prisma)
  DATABASE_URL: str({
    desc: 'PostgreSQL connection string, e.g. postgresql://postgres:password@localhost:5432/prinzex',
  }),

  // MongoDB (Mongoose)
  MONGODB_URI: str({
    desc: 'MongoDB connection string, e.g. mongodb://localhost:27017/prinzex',
  }),

  // Redis (ioredis)
  REDIS_HOST: str({ default: 'localhost' }),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_PASSWORD: str({ default: '' }),

  // JWT
  JWT_ACCESS_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  JWT_ACCESS_EXPIRES_IN: str({ default: '15m' }),
  JWT_REFRESH_EXPIRES_IN: str({ default: '7d' }),

  // File storage (stub)
  AWS_BUCKET_NAME: str({ default: 'prinzex-uploads' }),
  AWS_REGION: str({ default: 'ap-south-1' }),
  AWS_ACCESS_KEY_ID: str({ default: '' }),
  AWS_SECRET_ACCESS_KEY: str({ default: '' }),

  // Email (stub)
  SMTP_HOST: str({ default: 'smtp.mailtrap.io' }),
  SMTP_PORT: port({ default: 2525 }),
  SMTP_USER: str({ default: '' }),
  SMTP_PASS: str({ default: '' }),

  // Razorpay (live wiring — payments step; empty keys keep dev booting,
  // gateway calls then fail loudly at the SDK boundary)
  RAZORPAY_KEY_ID: str({ default: '' }),
  RAZORPAY_KEY_SECRET: str({ default: '' }),
  RAZORPAY_WEBHOOK_SECRET: str({ default: '' }),

  // Platform settings
  PLATFORM_COMMISSION_RATE: num({ default: 0.12 }),
  // Minimum seller pending balance (in ₹) required to request a payout
  MIN_PAYOUT_THRESHOLD: num({ default: 500 }),
  // Minimum delivery-boy pending earnings (in ₹) required to request a payout
  DELIVERY_MIN_PAYOUT_THRESHOLD: num({ default: 200 }),

  // CORS — comma-separated origin list for the Next.js frontend
  CORS_ORIGIN: str({ default: 'http://localhost:3000' }),
});

export type Env = typeof env;
