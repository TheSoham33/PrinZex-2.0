import { useQuery } from '@tanstack/react-query';
import { apiRequest, get } from './client';

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

/** Matches the backend default — only used until GET /upload/limits answers. */
export const FALLBACK_MAX_UPLOAD_MB = 100;

/** GET /upload/limits (public) — the admin-configured order-file cap.
 *  Follows the catalog-options pattern: one cached fetch, shipped fallback. */
export function useUploadLimits(): { maxDesignFileSizeMb: number } {
  const { data } = useQuery({
    queryKey: ['upload-limits'],
    queryFn: () => get<{ maxDesignFileSizeMb: number }>('/upload/limits'),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return { maxDesignFileSizeMb: data?.maxDesignFileSizeMb ?? FALLBACK_MAX_UPLOAD_MB };
}
