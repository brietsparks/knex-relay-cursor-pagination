import { Knex } from 'knex';

import { posts } from '../data';

export async function up(knex: Knex) {
  await knex.schema.createTable('posts', table => {
    table.uuid('id').primary();
    table.timestamp('creation_timestamp').notNullable();
    table.string('title').notNullable();
  });

  await knex.into('posts').insert(posts);
}

export function down(knex: Knex) {
  knex.schema.dropTableIfExists('comments');
  knex.schema.dropTableIfExists('posts');
}
