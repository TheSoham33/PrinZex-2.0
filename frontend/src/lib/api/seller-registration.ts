import { apiRequest, post } from './client';

/** Apply to become a seller. */
export const registerSeller = async (data: any): Promise<any> => post('/seller/register', data);

/** Upload KYC documents for seller verification. */
export const uploadSellerDocuments = async (formData: FormData): Promise<any> => {
  return apiRequest<any>('/seller/register/documents', {
    method: 'POST',
    body: formData,
  });
};
