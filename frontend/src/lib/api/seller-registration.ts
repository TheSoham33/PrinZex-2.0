import { apiRequest } from './client';

/** Apply to become a seller. */
export const registerSeller = async (data: any): Promise<any> => {
  return apiRequest<any>('/seller/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/** Upload KYC documents for seller verification. */
export const uploadSellerDocuments = async (formData: FormData): Promise<any> => {
  return apiRequest<any>('/seller/register/documents', {
    method: 'POST',
    body: formData,
  });
};

/** Get the status of a seller application. */
export const getSellerRegistrationStatus = async (): Promise<any> => {
  return apiRequest<any>('/seller/register/status');
};
