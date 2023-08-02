import knex, { Knex } from 'knex';
import { KnexNameUtil } from 'knex-name-util';

import {
  createPagination,
  PaginationDatasetParams,
  ForwardPaginationSliceParams,
  BackwardPaginationSliceParams,
  Page,
} from '../src';

import { posts } from './data';
import { createPgTestcontainer, StartedPgTestContainer } from './setup';

interface ForwardPagingTestCase {
  sliceParams: ForwardPaginationSliceParams;
  expected: Page;
}

interface BackwardPagingTestCase {
  sliceParams: BackwardPaginationSliceParams;
  expected: Page;
}

describe('createPagination', () => {
  let db: Knex;
  let pgContainer: StartedPgTestContainer;

  beforeAll(async () => {
    const [container, connection] = await createPgTestcontainer();
    pgContainer = container;
    db = knex({
      client: 'pg',
      connection,
      migrations: {
        directory: `${__dirname}/migrations`,
      },
    });
    await db.migrate.up();
  });

  afterAll(async () => {
    await db.destroy();
    await pgContainer.stop();
  });

  const baseParams: PaginationDatasetParams = {
    from: 'posts',
    sortColumn: 'creation_timestamp',
    sortDirection: 'desc',
    cursorColumn: 'id',
  };

  describe('paging variants', () => {
    const sortedPosts = [...posts].sort(
      (a, b) => b.creation_timestamp.getTime() - a.creation_timestamp.getTime()
    );

    describe('forward paging', () => {
      const cases: Array<[string, ForwardPagingTestCase]> = [
        [
          'first...last, row-count at limit',
          {
            sliceParams: { first: posts.length },
            expected: {
              edges: [
                { node: posts[7], cursor: btoa(posts[7].id) },
                { node: posts[6], cursor: btoa(posts[6].id) },
                { node: posts[5], cursor: btoa(posts[5].id) },
                { node: posts[4], cursor: btoa(posts[4].id) },
                { node: posts[3], cursor: btoa(posts[3].id) },
                { node: posts[2], cursor: btoa(posts[2].id) },
                { node: posts[1], cursor: btoa(posts[1].id) },
                { node: posts[0], cursor: btoa(posts[0].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[7].id),
                endCursor: btoa(posts[0].id),
                hasPreviousPage: false,
                hasNextPage: false,
              },
            },
          },
        ],
        [
          'first...last, row-count under limit',
          {
            sliceParams: { first: posts.length + 1 },
            expected: {
              edges: [
                { node: posts[7], cursor: btoa(posts[7].id) },
                { node: posts[6], cursor: btoa(posts[6].id) },
                { node: posts[5], cursor: btoa(posts[5].id) },
                { node: posts[4], cursor: btoa(posts[4].id) },
                { node: posts[3], cursor: btoa(posts[3].id) },
                { node: posts[2], cursor: btoa(posts[2].id) },
                { node: posts[1], cursor: btoa(posts[1].id) },
                { node: posts[0], cursor: btoa(posts[0].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[7].id),
                endCursor: btoa(posts[0].id),
                hasPreviousPage: false,
                hasNextPage: false,
              },
            },
          },
        ],
        [
          'first...n',
          {
            sliceParams: { first: 3 },
            expected: {
              edges: [
                { node: posts[7], cursor: btoa(posts[7].id) },
                { node: posts[6], cursor: btoa(posts[6].id) },
                { node: posts[5], cursor: btoa(posts[5].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[7].id),
                endCursor: btoa(posts[5].id),
                hasPreviousPage: false,
                hasNextPage: true,
              },
            },
          },
        ],
        [
          'm...n',
          {
            sliceParams: {
              first: 3,
              after: btoa(sortedPosts[2].id),
            },
            expected: {
              edges: [
                { node: posts[4], cursor: btoa(posts[4].id) },
                { node: posts[3], cursor: btoa(posts[3].id) },
                { node: posts[2], cursor: btoa(posts[2].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[4].id),
                endCursor: btoa(posts[2].id),
                hasPreviousPage: true,
                hasNextPage: true,
              },
            },
          },
        ],
        [
          'm...last, row-count at limit',
          {
            sliceParams: {
              first: 3,
              after: btoa(sortedPosts.at(-4)!.id),
            },
            expected: {
              edges: [
                { node: posts[2], cursor: btoa(posts[2].id) },
                { node: posts[1], cursor: btoa(posts[1].id) },
                { node: posts[0], cursor: btoa(posts[0].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[2].id),
                endCursor: btoa(posts[0].id),
                hasPreviousPage: true,
                hasNextPage: false,
              },
            },
          },
        ],
        [
          'm...last, row-count under limit',
          {
            sliceParams: {
              first: 4,
              after: btoa(sortedPosts.at(-4)!.id),
            },
            expected: {
              edges: [
                { node: posts[2], cursor: btoa(posts[2].id) },
                { node: posts[1], cursor: btoa(posts[1].id) },
                { node: posts[0], cursor: btoa(posts[0].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[2].id),
                endCursor: btoa(posts[0].id),
                hasPreviousPage: true,
                hasNextPage: false,
              },
            },
          },
        ],
      ];

      test.each(cases)('%s', async (_, testCase: ForwardPagingTestCase) => {
        const pagination = createPagination({
          ...baseParams,
          ...testCase.sliceParams,
        });

        const rows = await db
          .from('posts')
          .where(
            pagination.where.column,
            pagination.where.comparator,
            pagination.where.value
          )
          .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
          .limit(pagination.limit)
          .select('*');

        expect(pagination.getPage(rows)).toEqual(testCase.expected);
      });
    });

    describe('backward paging', () => {
      const cases: Array<[string, BackwardPagingTestCase]> = [
        [
          'last...first, row-count at limit',
          {
            sliceParams: { last: posts.length },
            expected: {
              edges: [
                { node: posts[7], cursor: btoa(posts[7].id) },
                { node: posts[6], cursor: btoa(posts[6].id) },
                { node: posts[5], cursor: btoa(posts[5].id) },
                { node: posts[4], cursor: btoa(posts[4].id) },
                { node: posts[3], cursor: btoa(posts[3].id) },
                { node: posts[2], cursor: btoa(posts[2].id) },
                { node: posts[1], cursor: btoa(posts[1].id) },
                { node: posts[0], cursor: btoa(posts[0].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[7].id),
                endCursor: btoa(posts[0].id),
                hasPreviousPage: false,
                hasNextPage: false,
              },
            },
          },
        ],
        [
          'last...first, row-count under limit',
          {
            sliceParams: { last: posts.length },
            expected: {
              edges: [
                { node: posts[7], cursor: btoa(posts[7].id) },
                { node: posts[6], cursor: btoa(posts[6].id) },
                { node: posts[5], cursor: btoa(posts[5].id) },
                { node: posts[4], cursor: btoa(posts[4].id) },
                { node: posts[3], cursor: btoa(posts[3].id) },
                { node: posts[2], cursor: btoa(posts[2].id) },
                { node: posts[1], cursor: btoa(posts[1].id) },
                { node: posts[0], cursor: btoa(posts[0].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[7].id),
                endCursor: btoa(posts[0].id),
                hasPreviousPage: false,
                hasNextPage: false,
              },
            },
          },
        ],
        [
          'last...m',
          {
            sliceParams: { last: 3 },
            expected: {
              edges: [
                { node: posts[2], cursor: btoa(posts[2].id) },
                { node: posts[1], cursor: btoa(posts[1].id) },
                { node: posts[0], cursor: btoa(posts[0].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[2].id),
                endCursor: btoa(posts[0].id),
                hasPreviousPage: true,
                hasNextPage: false,
              },
            },
          },
        ],
        [
          'n...m',
          {
            sliceParams: {
              last: 3,
              before: btoa(posts[2].id),
            },
            expected: {
              edges: [
                { node: posts[5], cursor: btoa(posts[5].id) },
                { node: posts[4], cursor: btoa(posts[4].id) },
                { node: posts[3], cursor: btoa(posts[3].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[5].id),
                endCursor: btoa(posts[3].id),
                hasPreviousPage: true,
                hasNextPage: true,
              },
            },
          },
        ],
        [
          'm...first, row-count at limit',
          {
            sliceParams: {
              last: 3,
              before: btoa(posts[4].id),
            },
            expected: {
              edges: [
                { node: posts[7], cursor: btoa(posts[7].id) },
                { node: posts[6], cursor: btoa(posts[6].id) },
                { node: posts[5], cursor: btoa(posts[5].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[7].id),
                endCursor: btoa(posts[5].id),
                hasPreviousPage: false,
                hasNextPage: true,
              },
            },
          },
        ],
        [
          'm...first, row-count under limit',
          {
            sliceParams: {
              last: 3,
              before: btoa(posts[4].id),
            },
            expected: {
              edges: [
                { node: posts[7], cursor: btoa(posts[7].id) },
                { node: posts[6], cursor: btoa(posts[6].id) },
                { node: posts[5], cursor: btoa(posts[5].id) },
              ],
              pageInfo: {
                startCursor: btoa(posts[7].id),
                endCursor: btoa(posts[5].id),
                hasPreviousPage: false,
                hasNextPage: true,
              },
            },
          },
        ],
      ];

      test.each(cases)('%s', async (_, testCase: BackwardPagingTestCase) => {
        const pagination = createPagination({
          ...baseParams,
          ...testCase.sliceParams,
        });

        const rows = await db
          .from('posts')
          .where(
            pagination.where.column,
            pagination.where.comparator,
            pagination.where.value
          )
          .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
          .limit(pagination.limit)
          .select('*');

        expect(pagination.getPage(rows)).toEqual(testCase.expected);
      });
    });

    test('forward paging, ascending', async () => {
      const pagination = createPagination({
        from: 'posts',
        sortColumn: 'creation_timestamp',
        sortDirection: 'asc',
        cursorColumn: 'id',
        first: 3,
      });

      const rows = await db
        .from('posts')
        .where(
          pagination.where.column,
          pagination.where.comparator,
          pagination.where.value
        )
        .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
        .limit(pagination.limit)
        .select('*');

      expect(pagination.getPage(rows)).toEqual({
        edges: [
          { node: posts[0], cursor: btoa(posts[0].id) },
          { node: posts[1], cursor: btoa(posts[1].id) },
          { node: posts[2], cursor: btoa(posts[2].id) },
        ],
        pageInfo: {
          startCursor: btoa(posts[0].id),
          endCursor: btoa(posts[2].id),
          hasPreviousPage: false,
          hasNextPage: true,
        },
      });
    });

    test('backward paging, ascending', async () => {
      const pagination = createPagination({
        from: 'posts',
        sortColumn: 'creation_timestamp',
        sortDirection: 'asc',
        cursorColumn: 'id',
        last: 3,
      });

      const rows = await db
        .from('posts')
        .where(
          pagination.where.column,
          pagination.where.comparator,
          pagination.where.value
        )
        .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
        .limit(pagination.limit)
        .select('*');

      expect(pagination.getPage(rows)).toEqual({
        edges: [
          { node: posts[5], cursor: btoa(posts[5].id) },
          { node: posts[6], cursor: btoa(posts[6].id) },
          { node: posts[7], cursor: btoa(posts[7].id) },
        ],
        pageInfo: {
          startCursor: btoa(posts[5].id),
          endCursor: btoa(posts[7].id),
          hasPreviousPage: true,
          hasNextPage: false,
        },
      });
    });
  });

  describe('query from a common-table-expression', () => {
    const cases: Array<[string, ForwardPagingTestCase]> = [
      [
        'first...last',
        {
          sliceParams: { first: 20 },
          expected: {
            edges: [
              { node: posts[4], cursor: btoa(posts[4].id) }, // 5 comments
              { node: posts[0], cursor: btoa(posts[0].id) }, // 4 comments
              { node: posts[3], cursor: btoa(posts[3].id) }, // 2 comments
              { node: posts[2], cursor: btoa(posts[2].id) }, // 2 comments
              { node: posts[6], cursor: btoa(posts[6].id) }, // 1 comment
              { node: posts[7], cursor: btoa(posts[7].id) }, // 0 comments
              { node: posts[5], cursor: btoa(posts[5].id) }, // 0 comments
              { node: posts[1], cursor: btoa(posts[1].id) }, // 0 comments
            ],
            pageInfo: {
              startCursor: btoa(posts[4].id),
              endCursor: btoa(posts[1].id),
              hasPreviousPage: false,
              hasNextPage: false,
            },
          },
        },
      ],
      [
        'm...n',
        {
          sliceParams: {
            first: 3,
            after: btoa('00000000-0000-0000-0000-000000000003'),
          },
          expected: {
            edges: [
              { node: posts[2], cursor: btoa(posts[2].id) },
              { node: posts[6], cursor: btoa(posts[6].id) },
              { node: posts[7], cursor: btoa(posts[7].id) },
            ],
            pageInfo: {
              startCursor: btoa(posts[2].id),
              endCursor: btoa(posts[7].id),
              hasPreviousPage: true,
              hasNextPage: true,
            },
          },
        },
      ],
    ];

    const baseParams: PaginationDatasetParams = {
      from: 'cte',
      sortColumn: 'comments_count',
      sortDirection: 'desc',
      cursorColumn: 'id',
    };

    test.each(cases)('%s', async (_, testCase) => {
      const cte = db
        .from('posts')
        .select(
          'posts.*',
          db.raw(
            `concat(count("comments"."id"), ':', "posts".id) as comments_count`
          )
        )
        .leftJoin('comments', 'posts.id', 'comments.post_id')
        .groupBy('posts.id')
        .orderBy('comments_count', 'desc');

      const pagination = createPagination({
        ...baseParams,
        ...testCase.sliceParams,
      });

      const rows = await db
        .with('cte', cte)
        .from('cte')
        .where(
          pagination.where.column,
          pagination.where.comparator,
          pagination.where.value
        )
        .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
        .limit(pagination.limit)
        .select('id', 'title', 'creation_timestamp');

      expect(pagination.getPage(rows)).toEqual(testCase.expected);
    });
  });

  describe('createPagination with knex-name-util', () => {
    interface Post {
      id: string;
      title: string;
      creationTimestamp: string;
    }

    test('', async () => {
      const postsTable = new KnexNameUtil('posts', {
        id: 'id',
        title: 'title',
        creationTimestamp: 'creation_timestamp',
      });

      const pagination = createPagination({
        from: postsTable.name,
        sortColumn: {
          column: postsTable.column('creationTimestamp'),
          alias: postsTable.prefixedAlias('creationTimestamp'),
        },
        sortDirection: 'desc',
        cursorColumn: {
          column: postsTable.column('id'),
          alias: postsTable.prefixedAlias('id'),
        },
        first: 3,
        after: btoa(posts[5].id),
      });

      const rows = await db
        .from(postsTable.name)
        .where(
          pagination.where.column,
          pagination.where.comparator,
          pagination.where.value
        )
        .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
        .limit(pagination.limit)
        .select(postsTable.selectAll());

      const page = pagination.getPage<Post>(rows, {
        mapItem: postsTable.toAlias,
      });

      expect(page).toEqual({
        edges: [
          {
            cursor: btoa(posts[4].id),
            node: {
              id: posts[4].id,
              title: posts[4].title,
              creationTimestamp: posts[4].creation_timestamp,
            },
          },
          {
            cursor: btoa(posts[3].id),
            node: {
              id: posts[3].id,
              title: posts[3].title,
              creationTimestamp: posts[3].creation_timestamp,
            },
          },
          {
            cursor: btoa(posts[2].id),
            node: {
              id: posts[2].id,
              title: posts[2].title,
              creationTimestamp: posts[2].creation_timestamp,
            },
          },
        ],
        pageInfo: {
          startCursor: btoa(posts[4].id),
          endCursor: btoa(posts[2].id),
          hasPreviousPage: true,
          hasNextPage: true,
        },
      });
    });
  });

  test('empty rows', async () => {
    const pagination = createPagination({
      from: 'posts',
      sortColumn: 'creation_timestamp',
      sortDirection: 'desc',
      cursorColumn: 'id',
      first: 2,
      after: btoa('99999999-9999-9999-9999-999999999999'),
    });

    const rows = await db
      .from('posts')
      .where(
        pagination.where.column,
        pagination.where.comparator,
        pagination.where.value
      )
      .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
      .limit(pagination.limit)
      .select('*');

    expect(pagination.getPage(rows)).toEqual({
      edges: [],
      pageInfo: {
        startCursor: undefined,
        endCursor: undefined,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });
  });

  test('throw if no slice params', () => {
    const testCase = () =>
      createPagination({
        from: 'posts',
        sortColumn: 'creation_timestamp',
        sortDirection: 'desc',
        cursorColumn: 'id',
      });

    expect(testCase).toThrow(
      new Error('pagination requires either a `first` or `last` param')
    );
  });

  test('custom obfuscateCursor and deobfuscateCursor', async () => {
    const pagination = createPagination({
      from: 'posts',
      sortColumn: 'creation_timestamp',
      sortDirection: 'desc',
      cursorColumn: 'id',
      first: 3,
      obfuscateCursor: (s) => s,
      deobfuscateCursor: (s) => s,
    });

    const rows = await db
      .from('posts')
      .where(
        pagination.where.column,
        pagination.where.comparator,
        pagination.where.value
      )
      .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
      .limit(pagination.limit)
      .select('*');

    expect(pagination.getPage(rows)).toEqual({
      edges: [
        { node: posts[7], cursor: posts[7].id },
        { node: posts[6], cursor: posts[6].id },
        { node: posts[5], cursor: posts[5].id },
      ],
      pageInfo: {
        startCursor: posts[7].id,
        endCursor: posts[5].id,
        hasPreviousPage: false,
        hasNextPage: true,
      },
    });
  });

  test('omit item onCursorMissing', async () => {
    const pagination = createPagination({
      from: 'posts',
      sortColumn: 'creation_timestamp',
      sortDirection: 'desc',
      cursorColumn: 'id',
      first: 3,
    });

    const rows = await db
      .from('posts')
      .where(
        pagination.where.column,
        pagination.where.comparator,
        pagination.where.value
      )
      .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
      .limit(pagination.limit)
      .select('*');

    delete rows[0].id;

    expect(pagination.getPage(rows)).toEqual({
      edges: [
        { node: posts[6], cursor: btoa(posts[6].id) },
        { node: posts[5], cursor: btoa(posts[5].id) },
      ],
      pageInfo: {
        startCursor: btoa(posts[6].id),
        endCursor: btoa(posts[5].id),
        hasPreviousPage: false,
        hasNextPage: true,
      },
    });
  });

  test('throw onCursorMissing', async () => {
    const pagination = createPagination({
      from: 'posts',
      sortColumn: 'creation_timestamp',
      sortDirection: 'desc',
      cursorColumn: 'id',
      first: 3,
      onCursorMissing: 'throw',
    });

    const rows = await db
      .from('posts')
      .where(
        pagination.where.column,
        pagination.where.comparator,
        pagination.where.value
      )
      .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
      .limit(pagination.limit)
      .select('*');

    delete rows[0].id;

    const testCase = () => pagination.getPage(rows);

    expect(testCase).toThrow(new Error('cursor is missing'));
  });

  test('throw when too many rows provided', async () => {
    const pagination = createPagination({
      from: 'posts',
      sortColumn: 'creation_timestamp',
      sortDirection: 'desc',
      cursorColumn: 'id',
      first: 3,
    });

    const rows = await db
      .from('posts')
      .where(
        pagination.where.column,
        pagination.where.comparator,
        pagination.where.value
      )
      .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
      .limit(pagination.limit)
      .select('*');

    rows.push({
      id: '99999999-9999-9999-9999-999999999999',
    });

    const testCase = () => pagination.getPage(rows);

    expect(testCase).toThrow(
      new Error(
        'the queried row count exceeds the expected limit based on the pagination params'
      )
    );
  });
});
