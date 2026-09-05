import { apiRequest } from './client';

export interface DesignUploadResult {
  fileUrl: string;
  fileName: string;
  sizeKb: number;
  mimeType: string;
  /** Office uploads only: exact pages of the converted PDF. */
  totalPages?: number;
  /** True when the stored file is a PDF converted from an Office original. */
  convertedToPdf?: boolean;
}

/** POST /upload/design — multipart, one file. Stays a raw apiRequest:
 *  the verb helpers only speak JSON, and FormData sets its own boundary. */
export const uploadDesign = (file: File): Promise<DesignUploadResult> => {
  const body = new FormData();
  body.append('file', file);
  return apiRequest<DesignUploadResult>('/upload/design', { method: 'POST', body });
};
