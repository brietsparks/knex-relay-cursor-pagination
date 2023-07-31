# Knex Relay Cursor Pagination

Easily implement [relay cursor pagination](https://relay.dev/graphql/connections.htm) in your Knex data layer.

## Install

```
yarn add knex-relay-cursor-pagination
```

## Usage

```ts
import { createPagination } from 'knex-relay-cursor-pagination';

export type Post = {
  id: string;
  title: string;
  creation_timestamp: string;
};

async function getPosts(first?: number, after?: string, last?: number, before?: string): Promise<Page<Post>> {
  const pagination = createPagination({
    from: 'posts',
    cursorColumn: 'id',
    sortColumn: 'creation_timestamp',
    sortDirection: 'desc',
    first,
    after,
    last,
    before,
  });

  const rows = await this.db.from('posts')
    .where(pagination.where.column, pagination.where.comparator, pagination.where.value)
    .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
    .limit(pagination.limit)
    .select('*');

  return pagination.getPage<Post>(rows);
}
```

## API

### `createPagination(params: PaginationParams)`

Takes a configuration parameter and returns an object containing values to pass into the knex query and a function to transform the queried rows into a Relay connection page object.

### Configuration parameters
#### Dataset configuration:
Required
- `cursorColumn`: the column to be used for the cursor. Values must be unique
- `sortColumn`: the column that the data is sorted by. Values must be unique
- `sortDirection`: the sort direction of the data
- `from`: the table or common-table-expression being queried from

#### Page slice configuration
Either `first` or `last` is required
- `first`: corresponds to the `first` param of the [Relay spec](https://relay.dev/graphql/connections.htm)
- `after`: corresponds to the `after` param of the [Relay spec](https://relay.dev/graphql/connections.htm)
- `last`: corresponds to the `last` param of the [Relay spec](https://relay.dev/graphql/connections.htm)
- `before`: corresponds to the `before` param of the [Relay spec](https://relay.dev/graphql/connections.htm)

#### Optional configuration
- `obfuscateCursor`: a function for transforming the cursor's raw value to an opaque value 
- `deobfuscateCursor`: a function for transforming the cursor's  opaque value to the raw value
- `onCursorMissing`: `'omit' | 'throw'`, the behavior for when a queried row's cursor value is missing. Defaults to `'omit'`

