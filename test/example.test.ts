import knex, { Knex } from 'knex';
import { v4 as uuid } from 'uuid';
import { faker } from '@faker-js/faker';

import { createPgTestcontainer, StartedPgTestContainer } from './setup';

import { createPagination } from '../src';


describe('example', () => {
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

  test('example', async () => {
    await db.raw(`
      CREATE TABLE users
      (
          id         UUID PRIMARY KEY,
          email      VARCHAR(255) NOT NULL,
          first_name VARCHAR(255),
          last_name  VARCHAR(255)
      );
  `);

    const insertions = [];
    for (let i = 0; i < 400; i++) {
      insertions.push({
        id: uuid(),
        email: faker.internet.email(),
        first_name: faker.person.firstName(),
        last_name: faker.person.firstName(),
      });
    }
    await db.into('users').insert(insertions);

    //
    // make sure there are 400 rows
    //
    const allRows = await db
      .select(
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
      )
      .from('users');

    expect(allRows.length).toEqual(400);

    //
    // test the pagination
    //
    const pagination = createPagination({
      from: 'users',
      sortColumn: 'first_name',
      sortDirection: 'desc',
      cursorColumn: 'id',
      first: 10,
    });

    const query = db
      .select(
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
      )
      .from('users')
      .where(
        pagination.where.column,
        pagination.where.comparator,
        pagination.where.value,
      )
      .orderBy(pagination.orderBy.column, pagination.orderBy.direction)
      .limit(pagination.limit);

    const rows = await query;
    const page = pagination.getPage(rows);
    expect(page.edges.length).toEqual(10);
  });

});
