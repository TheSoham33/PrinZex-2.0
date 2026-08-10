import { apiRequest } from './client';

export const updateProfile = async (data: { 
  name?: string; 
  email?: string; 
  phone?: string;
  avatarUrl?: string;
}): Promise<any> => {
  return apiRequest<any>('/customer/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const fetchProfile = async (): Promise<any> => {
  return apiRequest<any>('/customer/profile');
};

export const fetchAddresses = async (): Promise<any[]> => {
  return apiRequest<any[]>('/customer/addresses');
};

export const createAddress = async (data: any): Promise<any> => {
  return apiRequest<any>('/customer/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const deleteAddress = async (id: string): Promise<any> => {
  return apiRequest<any>(`/customer/addresses/${id}`, {
    method: 'DELETE',
  });
};

export const setDefaultAddress = async (id: string): Promise<any> => {
  return apiRequest<any>(`/customer/addresses/${id}/set-default`, {
    method: 'PATCH',
  });
};
