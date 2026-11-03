export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginatedMeta;
}

export function getPaginationOffsets(query: PaginationParams) {
  const page = query.page > 0 ? query.page : 1;
  const limit = query.limit > 0 ? query.limit : 10;
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  query: PaginationParams,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / query.limit);

  return {
    items,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
}
