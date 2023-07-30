import { Knex } from 'knex';

import { createPagination, PaginationParams, PaginationSliceParams } from '../../src';

export type Service = ReturnType<typeof createService>;

export function createService(db: Knex) {
  const postsProvider = new PostsProvider(db);
  return {
    postsProvider,
  };
}

export type Post = {
  id: string;
  title: string;
  creation_timestamp: string;
};

export interface GetPostsParams {
  pagination: PaginationSliceParams;
}

export class PostsProvider {
  constructor(
    private db: Knex
  ) {}

  getPosts = async (params: GetPostsParams) => {
    const pagination = createPagination({
      from: 'posts',
      cursorColumn: 'id',
      sortColumn: 'creation_timestamp',
      sortDirection: 'desc',
      ...params.pagination
    } as PaginationParams);

    const rows = await this.db.from('posts')
      .where(pagination.where.column, pagination.where.comparator, pagination.where.value)
      .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
      .limit(pagination.limit)
      .select('*');

    return  pagination.getPage<Post>(rows);
  };
}

