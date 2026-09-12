/**
 * Offset/cursor pagination helper shared by every list endpoint.
 *
 * Usage:
 *   const [total, data] = await prisma.$transaction([...count, ...findMany]);
 *   return buildPaginatedResponse(data, total, params);
 */

export interface PaginationParams {
  page: number; // default 1
  limit: number; // default 20, max 100
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/** Prisma skip/take for a params object. */
export function toSkipTake(params: PaginationParams): { skip: number; take: number } {
  return { skip: (params.page - 1) * params.limit, take: params.limit };
}

/** Wrap a page of data + total count in the standard envelope. */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResponse<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

/**
 * Convenience runner: executes count + page fetch in parallel and wraps
 * the result. Used by services that paginate outside Prisma (e.g. MongoDB).
 */
export async function paginate<T>(
  params: PaginationParams,
  count: () => Promise<number>,
  list: (skip: number, take: number) => Promise<T[]>,
): Promise<PaginatedResponse<T>> {
  const { skip, take } = toSkipTake(params);
  const [total, data] = await Promise.all([count(), list(skip, take)]);
  return buildPaginatedResponse(data, total, params);
}
