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

export const getMe = async (role: 'CUSTOMER' | 'SELLER' | 'ADMIN'): Promise<any> => {
  let endpoint = '/auth/me';
  if (role === 'SELLER') endpoint = '/seller/auth/me';
  if (role === 'ADMIN') endpoint = '/admin/auth/me';
  
  return apiRequest<any>(endpoint);
};

export const logout = async (role: 'CUSTOMER' | 'SELLER' | 'ADMIN', refreshToken: string): Promise<any> => {
  let endpoint = '/auth/logout';
  if (role === 'SELLER') endpoint = '/seller/auth/logout';
  if (role === 'ADMIN') endpoint = '/admin/auth/logout';
  
  return apiRequest<any>(endpoint, {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
};

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
