import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Email service — STUB.
 *
 * SMTP credentials land in a later step; until then every "send" is a
 * structured log line (visible in dev console / log aggregation), which
 * keeps auth flows fully testable without a mail server.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

async function deliver(message: EmailMessage): Promise<void> {
  logger.info('email_stub: message "sent"', {
    to: message.to,
    subject: message.subject,
    body: message.text,
    // SMTP config is intentionally unused until the real integration.
    smtpConfigured: env.SMTP_HOST.length > 0,
  });
}

export async function sendVerificationEmail(to: string, otp: string, name?: string): Promise<void> {
  await deliver({
    to,
    subject: 'Verify your PrinZex account',
    text: `Hi ${name ?? 'there'}, your PrinZex verification code is ${otp}. It expires in 10 minutes.`,
  });
}

export async function sendPasswordResetEmail(to: string, otp: string, name?: string): Promise<void> {
  await deliver({
    to,
    subject: 'Reset your PrinZex password',
    text: `Hi ${name ?? 'there'}, your password reset code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
  });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await deliver({
    to,
    subject: 'Welcome to PrinZex!',
    text: `Hi ${name}, welcome to PrinZex — print anything, delivered fast.`,
  });
}

/** Sent after a customer's seller application is accepted into review. */
export async function sendSellerWelcomeEmail(to: string, ownerName: string, storeName: string): Promise<void> {
  await deliver({
    to,
    subject: `Your store "${storeName}" is under review`,
    text: `Hi ${ownerName}, thanks for registering "${storeName}" as a PrinZex print store. Our team is reviewing your application — we'll notify you once it's approved.`,
  });
}

/** Sent when a seller adds a team member to their store. */
export async function sendTeamInviteEmail(
  to: string,
  memberName: string,
  storeName: string,
  role: string,
): Promise<void> {
  await deliver({
    to,
    subject: `You've been added to "${storeName}" on PrinZex`,
    text: `Hi ${memberName}, the team at "${storeName}" has added you as ${role}. Reach out to the store owner for access details.`,
  });
}

/** Sent when an admin approves a seller application. */
export async function sendSellerApprovalEmail(to: string, ownerName: string, storeName: string): Promise<void> {
  await deliver({
    to,
    subject: `Your store "${storeName}" is now live on PrinZex`,
    text: `Congratulations ${ownerName}! "${storeName}" has been approved. Customers can now find your store and place orders.`,
  });
}

/** Sent when a SUPER_ADMIN invites a new admin account. */
export async function sendAdminInviteEmail(to: string, name: string, tempPassword: string, role: string): Promise<void> {
  await deliver({
    to,
    subject: 'Your PrinZex admin account',
    text: `Hi ${name}, an admin account (${role}) has been created for you on PrinZex. Sign in with this temporary password and change it immediately: ${tempPassword}`,
  });
}

/** SMS stub — same treatment until an SMS gateway is integrated. */
export async function sendOtpSms(to: string, otp: string, purpose: string): Promise<void> {
  logger.info('sms_stub: message "sent"', { to, purpose, otp });
}

/** Generic transactional SMS stub (alerts, welcomes) — gateway lands later. */
export async function sendSms(to: string, message: string): Promise<void> {
  logger.info('sms_stub: message "sent"', { to, message });
}
