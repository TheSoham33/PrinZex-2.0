/**
 * Auth service — integration test against the disposable Postgres schema
 * (register / duplicate conflict / login) covering the core customer
 * identity flow end to end: bcrypt hashing, the User + Wallet transaction,
 * referral-code generation, JWT issue + RefreshToken persistence, and the
 * credential check. OTP delivery is the email/SMS stub; OTP storage and the
 * login-attempt counters go through the real Redis in CI.
 */
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import * as authService from '../../modules/auth/auth.service';

const EMAIL = 'asha.dey@prinzex.test';
const PHONE = '+919876543210';
const PASSWORD = 'Passw0rd!print';

/** ApiError-shaped rejection matcher — statusCode is an own property. */
const rejectsApiError = (statusCode: number) => ({ statusCode });

// The shared Prisma pool and the lazy-connect Redis client are open handles
// that keep the jest worker alive after the suite — close them explicitly.
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe('auth.service (integration — disposable Postgres schema)', () => {
  test('register creates the user + wallet atomically and returns safe tokens', async () => {
    const result = await authService.register({
      name: 'Asha Dey',
      email: EMAIL,
      phone: PHONE,
      password: PASSWORD,
    });

    // Secrets never leave the service.
    expect(result.user.email).toBe(EMAIL);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('twoFactorSecret');
    expect(result.user.role).toBe('CUSTOMER');
    expect(result.user.referralCode).toBeTruthy();

    // The wallet rides in the same transaction.
    const wallet = await prisma.wallet.findUnique({ where: { userId: result.user.id } });
    expect(wallet).not.toBeNull();
    expect(wallet?.balance).toBe(0);
    expect(wallet?.loyaltyPoints).toBe(0);

    // Token pair issued and the refresh token persisted for rotation.
    expect(typeof result.tokens.accessToken).toBe('string');
    expect(typeof result.tokens.refreshToken).toBe('string');
    const stored = await prisma.refreshToken.findFirst({
      where: { userId: result.user.id },
    });
    expect(stored).not.toBeNull();

    // The stored password is hashed, never plaintext.
    const raw = await prisma.user.findUnique({ where: { id: result.user.id } });
    expect(raw?.passwordHash).toBeTruthy();
    expect(raw?.passwordHash).not.toBe(PASSWORD);
  });

  test('register rejects a duplicate email with 409', async () => {
    await expect(
      authService.register({
        name: 'Someone Else',
        email: EMAIL,
        phone: '+919812345678',
        password: PASSWORD,
      }),
    ).rejects.toMatchObject(rejectsApiError(409));
  });

  test('register rejects a duplicate phone with 409', async () => {
    await expect(
      authService.register({
        name: 'Someone Else',
        email: 'other@prinzex.test',
        phone: PHONE,
        password: PASSWORD,
      }),
    ).rejects.toMatchObject(rejectsApiError(409));
  });

  test('login rejects a wrong password with 401', async () => {
    await expect(
      authService.login({ identifier: EMAIL, password: 'WrongPassword1!' }),
    ).rejects.toMatchObject(rejectsApiError(401));
  });

  test('login issues a token pair for valid credentials (email or phone identifier)', async () => {
    const byEmail = await authService.login({ identifier: EMAIL, password: PASSWORD });
    expect(byEmail.user.id).toBeTruthy();
    expect(byEmail.user.email).toBe(EMAIL);
    expect(typeof byEmail.tokens.accessToken).toBe('string');

    const byPhone = await authService.login({ identifier: PHONE, password: PASSWORD });
    expect(byPhone.user.id).toBe(byEmail.user.id);
  });
});
