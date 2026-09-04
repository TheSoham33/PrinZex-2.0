import { get, post, patch, del } from './client';

export const updateProfile = async (data: { 
  name?: string; 
  email?: string; 
  phone?: string;
  avatarUrl?: string;
}): Promise<any> => patch('/customer/profile', data);

export const fetchAddresses = async (): Promise<any[]> => {
  return get<any[]>('/customer/addresses');
};

export const createAddress = async (data: any): Promise<any> => post('/customer/addresses', data);

export const deleteAddress = async (id: string): Promise<any> => {
  return del(`/customer/addresses/${id}`);
};

export const setDefaultAddress = async (id: string): Promise<any> => patch(`/customer/addresses/${id}/set-default`);
