import { apiRequest } from './client';

export const customerLogin = async (data: any): Promise<any> => {
  return apiRequest<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const customerRegister = async (data: any): Promise<any> => {
  return apiRequest<any>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const sellerLogin = async (data: any): Promise<any> => {
  return apiRequest<any>('/seller/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const adminLogin = async (data: any): Promise<any> => {
  return apiRequest<any>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// ponytail: sign-out is client-only (redux logout + token clear); the
// /auth/logout refresh-token invalidation endpoint is intentionally unwired.
// Ceiling — access tokens are short-lived, so risk is bounded. Upgrade path:
// call role-specific /logout from the logout handlers before dispatching.

export const forgotPassword = async (identifier: string): Promise<any> => {
  return apiRequest<any>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });
};

export const resetPassword = async (data: any): Promise<any> => {
  return apiRequest<any>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
