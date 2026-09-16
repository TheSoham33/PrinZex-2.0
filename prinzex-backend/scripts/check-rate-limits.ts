/**
 * check-rate-limits — asserts the global rate limiter stays one middleware with
 * per-route overrides, and that the sensitive endpoints keep their stricter
 * budgets. Pure config assertions (no Redis / HTTP needed).
 *
 * Usage: npx tsx scripts/check-rate-limits.ts
 */
// Placeholder env for config/env (envalid) — imported before rateLimiter.
import '../src/__tests__/setup-unit-env';
import {
  GLOBAL_RATE_LIMIT_DEFAULT,
  RATE_LIMIT_OVERRIDES,
  RATE_LIMIT_SKIP_PATHS,
} from '../src/middlewares/rateLimiter';

type Failure = string;
const failures: Failure[] = [];
const expect = (condition: boolean, message: string): void => {
  if (!condition) failures.push(message);
};

const byRoute = new Map(RATE_LIMIT_OVERRIDES.map((o) => [`${o.method} ${o.path}`, o]));

// ── Default allowance covers normal traffic ─────────────────────────────────
expect(GLOBAL_RATE_LIMIT_DEFAULT.windowSeconds === 60, 'default window should be 60s');
expect(GLOBAL_RATE_LIMIT_DEFAULT.maxRequests === 100, 'default should allow 100 req/min');

// ── Logins: 5 / 15 min / IP ─────────────────────────────────────────────────
const LOGINS = ['/api/auth/login', '/api/seller/auth/login', '/api/admin/auth/login'];
for (const path of LOGINS) {
  const o = byRoute.get(`POST ${path}`);
  expect(!!o, `missing login override: ${path}`);
  if (!o) continue;
  expect(o.windowSeconds === 15 * 60, `login window wrong for ${path}`);
  expect(o.maxRequests === 5, `login budget wrong for ${path}`);
  expect(o.keyGenerator === undefined, `login ${path} must bucket by IP (no keyGenerator)`);
}

// ── OTP sends: 3 / 10 min per identifier — including delivery OTP login ─────
const OTP_SENDS = [
  '/api/auth/send-signup-otp',
  '/api/auth/send-login-otp',
  '/api/auth/resend-otp',
  '/api/auth/forgot-password',
  '/api/delivery/auth/login',
];
for (const path of OTP_SENDS) {
  const o = byRoute.get(`POST ${path}`);
  expect(!!o, `missing otp_send override: ${path}`);
  if (!o) continue;
  expect(o.windowSeconds === 10 * 60, `otp window wrong for ${path}`);
  expect(o.maxRequests === 3, `otp budget wrong for ${path}`);
  expect(o.name === 'otp_send', `otp bucket name wrong for ${path}`);
  expect(typeof o.keyGenerator === 'function', `otp ${path} must bucket by identifier, not IP`);
}

// The OTP key generator must prefer the body identifier over the IP.
const otpOverride = byRoute.get('POST /api/auth/send-login-otp');
if (otpOverride?.keyGenerator) {
  const req = { body: { email: 'a@b.com' }, ip: '1.2.3.4' } as never;
  expect(otpOverride.keyGenerator(req) === 'a@b.com', 'otp identity should come from the body');
  const noBody = { body: {}, ip: '1.2.3.4' } as never;
  expect(otpOverride.keyGenerator(noBody) === '1.2.3.4', 'otp identity should fall back to IP');
}

// ── Registrations: 5 / 15 min / IP ──────────────────────────────────────────
const REGISTRATIONS = ['/api/auth/register', '/api/seller/register', '/api/delivery/register'];
for (const path of REGISTRATIONS) {
  const o = byRoute.get(`POST ${path}`);
  expect(!!o, `missing registration override: ${path}`);
  if (!o) continue;
  expect(o.windowSeconds === 15 * 60 && o.maxRequests === 5, `registration budget wrong for ${path}`);
}

// ── Exemptions: probes + payment webhooks never 429 ─────────────────────────
expect(RATE_LIMIT_SKIP_PATHS.has('/health'), '/health must skip rate limiting');
expect(RATE_LIMIT_SKIP_PATHS.has('/api/payments/webhook'), 'payment webhook must skip rate limiting');
expect(
  !RATE_LIMIT_OVERRIDES.some((o) => o.path === '/api/payments/webhook'),
  'payment webhook must not carry an override (it is skipped entirely)',
);

// ── No accidental duplicates (same method+path twice = double counting) ─────
expect(byRoute.size === RATE_LIMIT_OVERRIDES.length, 'override table has duplicate method+path entries');

if (failures.length > 0) {
  console.error('check-rate-limits: FAILED');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `check-rate-limits: OK — 1 global limiter (${GLOBAL_RATE_LIMIT_DEFAULT.maxRequests}/${GLOBAL_RATE_LIMIT_DEFAULT.windowSeconds}s default), ` +
    `${RATE_LIMIT_OVERRIDES.length} per-route overrides, ${RATE_LIMIT_SKIP_PATHS.size} skipped paths`,
);
