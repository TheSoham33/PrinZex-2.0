import { post } from './client';

export const customerLogin = async (data: any): Promise<any> => post('/auth/login', data);

export const customerRegister = async (data: any): Promise<any> => post('/auth/register', data);

export const sellerLogin = async (data: any): Promise<any> => post('/seller/auth/login', data);

export const adminLogin = async (data: any): Promise<any> => post('/admin/auth/login', data);

// ponytail: sign-out is client-only (redux logout + token clear); the
// /auth/logout refresh-token invalidation endpoint is intentionally unwired.
// Ceiling — access tokens are short-lived, so risk is bounded. Upgrade path:
// call role-specific /logout from the logout handlers before dispatching.

export const forgotPassword = async (identifier: string): Promise<any> => post('/auth/forgot-password', { identifier });

export const resetPassword = async (data: any): Promise<any> => post('/auth/reset-password', data);
