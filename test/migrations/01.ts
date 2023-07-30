import { Knex } from 'knex';

import { posts, comments } from '../data';

export async function up(knex: Knex) {
  await knex.schema.createTable('posts', table => {
    table.uuid('id').primary();
    table.timestamp('creation_timestamp').notNullable();
    table.string('title').notNullable();
  });

  await knex.schema.createTable('comments', table => {
    table.uuid('id').primary();
    table.timestamp('creation_timestamp').notNullable();
    table.uuid('post_id').notNullable().references('id').inTable('posts');
    table.string('value').notNullable();
  });

  await knex.into('posts').insert(posts);
  await knex.into('comments').insert(comments);
}

export function down(knex: Knex) {
  knex.schema.dropTableIfExists('comments');
  knex.schema.dropTableIfExists('posts');
}
