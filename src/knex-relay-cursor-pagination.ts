import { Knex } from 'knex';

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;

export type PaginationParams = PaginationSliceParams &
  PaginationDatasetParams &
  PaginationCursorParams;

export interface PaginationDatasetParams {
  from: string;
  cursorColumn: Column;
  sortColumn: Column;
  sortDirection: SortDirection;
}

export interface PaginationCursorParams {
  obfuscateCursor?: (cursor: Cursor) => Cursor;
  deobfuscateCursor?: (obfuscatedCursor: Cursor) => Cursor;
  onCursorMissing?: 'throw' | 'omit';
}

type Column = XOR<string, AliasedColumn>;

interface AliasedColumn {
  column: string;
  alias: string;
}

export type PaginationSliceParams = ForwardPaginationSliceParams &
  BackwardPaginationSliceParams;

export interface ForwardPaginationSliceParams {
  first?: number;
  after?: Cursor;
}

export interface BackwardPaginationSliceParams {
  last?: number;
  before?: Cursor;
}

interface InternalSliceParams {
  direction: PaginationDirection;
  limit: number;
  cursor?: Cursor;
}

type PaginationDirection = 'forward' | 'backward';

export interface Predicate {
  orderBy: OrderBy;
  limit: number;
  where: Where;
}

export type Cursor = string | number;

export type OrderBy = {
  column: string;
  direction: SortDirection;
};

export type SortDirection = 'asc' | 'desc';

export interface Where {
  column: string;
  comparator: Comparator;
  value: (b: Knex.QueryBuilder) => Knex.QueryBuilder;
}

export interface NoopWhere {
  column: (q: Knex.QueryBuilder) => Knex.QueryBuilder;
  comparator: '>';
  value: 0;
}

export interface Edge<T = unknown> {
  cursor: Cursor;
  node: T;
}

export interface PageInfo {
  endCursor?: Cursor;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: Cursor;
}

export interface Page<T = unknown> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
}

type Row = { [key: string]: unknown };

export function createPagination(params: PaginationParams) {
  const { first, after, last, before } = params;

  if (first === undefined && last === undefined) {
    throw new Error('pagination requires either a `first` or `last` param');
  }

  const paginationSliceParams = getInternalSliceParams({
    first,
    after,
    last,
    before,
  } as PaginationSliceParams);

  const comparator = getComparator(
    params.sortDirection,
    paginationSliceParams.direction
  );
  const sortDirection = getSortDirection(
    params.sortDirection,
    paginationSliceParams.direction
  );
  const sortColumn = getColumn(params.sortColumn);
  const cursorColumn = getColumn(params.cursorColumn);

  const orderBy: OrderBy = {
    column: sortColumn,
    direction: sortDirection,
  };
  const returnableLimit = paginationSliceParams.limit;
  const queryableLimit = paginationSliceParams.limit + 1;

  const where = ((): Where => {
    if (paginationSliceParams.cursor === undefined) {
      // this is a noop where-clause value that can
      // be passed to knex .where in same way as the
      // non-noop where-clause value and still work
      return {
        column: (q: Knex.QueryBuilder) => q,
        comparator: '>',
        value: 0,
      } as unknown as Where;
    }

    const { deobfuscateCursor = atob } = params;
    const cursor = deobfuscateCursor(paginationSliceParams.cursor as string);

    const subquery = (q: Knex.QueryBuilder): any =>
      q
        .from(params.from)
        .select(sortColumn)
        .where(cursorColumn, '=', cursor as Knex.Value);

    return {
      column: sortColumn,
      comparator: comparator,
      value: subquery,
    };
  })();

  const predicate: Predicate = {
    orderBy,
    limit: queryableLimit,
    where,
  };

  const processItems = (rows: Row[]): [Row[], Row | undefined] => {
    if (rows.length === 0) {
      return [[], undefined];
    }

    if (rows.length <= returnableLimit) {
      return [
        paginationSliceParams.direction === 'backward'
          ? [...rows.reverse()]
          : rows,
        undefined,
      ];
    }

    if (rows.length === queryableLimit) {
      const itemsOfPage = [...rows];
      const adjacentItem = itemsOfPage.pop();
      return [
        paginationSliceParams.direction === 'backward'
          ? itemsOfPage.reverse()
          : itemsOfPage,
        adjacentItem,
      ];
    }

    throw new Error(
      'the queried row count exceeds the expected limit based on the pagination params'
    );
  };

  function getPage<T = Row>(
    rows: Row[],
    opts: { mapItem?: (item: Row) => T } = {}
  ): Page<T> {
    const { obfuscateCursor = btoa, onCursorMissing = 'omit' } = params;
    const { mapItem = (item: Row) => item } = opts;
    const cursorAlias = getAlias(params.cursorColumn);

    const [items, adjacentItem] = processItems(rows);

    if (items.length === 0) {
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          endCursor: undefined,
          startCursor: undefined,
        },
      };
    }

    const edges = [];
    for (const item of items) {
      const cursor = item[cursorAlias];
      if (cursor === undefined || cursor === null) {
        if (onCursorMissing === 'throw') {
          throw new Error('cursor is missing');
        } else {
          continue;
        }
      }

      const edge = {
        cursor: obfuscateCursor(cursor.toString()),
        node: mapItem(item as Row),
      };

      edges.push(edge);
    }

    const pageInfo: PageInfo = {
      hasNextPage:
        paginationSliceParams.direction === 'backward'
          ? !!before
          : !!adjacentItem,
      hasPreviousPage:
        paginationSliceParams.direction === 'forward'
          ? !!after
          : !!adjacentItem,
      startCursor: edges[0].cursor,
      endCursor: edges[edges.length - 1].cursor,
    };

    return {
      edges,
      pageInfo,
    } as unknown as Page<T>;
  }

  return {
    ...predicate,
    getPage,
  };
}

function getColumn(column: Column): string {
  if (typeof column === 'string') {
    return column;
  }
  const aliasedColumn = column as AliasedColumn;
  return aliasedColumn.column;
}

function getAlias(column: Column): string {
  if (typeof column === 'string') {
    return column;
  }
  const aliasedColumn = column as AliasedColumn;
  return aliasedColumn.alias;
}

function getInternalSliceParams(
  sliceParams: PaginationSliceParams
): InternalSliceParams {
  if (sliceParams.last) {
    return {
      direction: 'backward',
      cursor: sliceParams.before,
      limit: sliceParams.last,
    };
  }

  const forwardSliceParams = sliceParams as ForwardPaginationSliceParams;
  return {
    direction: 'forward',
    cursor: forwardSliceParams.after,
    limit: forwardSliceParams.first,
  } as InternalSliceParams;
}

function getSortDirection(
  specifiedSortDirection: SortDirection,
  paginationDirection: PaginationDirection
) {
  if (paginationDirection === 'forward') {
    return specifiedSortDirection;
  }

  if (specifiedSortDirection === 'desc') {
    return 'asc';
  }

  return 'desc';
}

type Comparator = '<' | '>';

function getComparator(
  specifiedSortDirection: SortDirection,
  paginationDirection: PaginationDirection
): Comparator {
  if (specifiedSortDirection === 'desc') {
    if (paginationDirection === 'forward') {
      return '<';
    }
    if (paginationDirection === 'backward') {
      return '>';
    }
  }

  if (paginationDirection === 'forward') {
    return '>';
  }

  return '<';
}
