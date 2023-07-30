import { config as configureEnv } from 'dotenv';
import knex from 'knex';
import { ApolloServer } from 'apollo-server';
import { readFileSync } from 'fs';
import pg from 'pg';

import { createResolvers } from './resolvers';
import { createService } from './service';

configureEnv();

const action = process.argv[2];

if (action === 'pg') {
  switch (process.argv[3]) {
    case 'up':
      void getDb()
        .then(db => db.migrate.up())
        .then(() => process.exit(0));
      break;
    case 'down':
      void getDb()
        .then(db => db.migrate.down())
        .then(() => process.exit(0));
      break;
  }
}

if (action === 'serve') {
  getApolloServer()
    .then(s => s.listen())
    .then(r => console.log(`Server ready at ${r.url}`))
}

async function getApolloServer() {
  const service = await getService();
  const typeDefs = readFileSync(require.resolve('./schema/schema.graphql')).toString('utf-8');
  return new ApolloServer({
    typeDefs,
    resolvers: createResolvers(service),
    introspection: true,
  });
}

async function getService() {
  const db = await getDb();
  return createService(db);
}

async function getDb() {
  pg.types.setTypeParser(1184, (v: unknown) => v.toString()); // timestamptz
  return knex({
    client: 'pg',
    migrations: {
      directory: `${__dirname}/migrations`,
    },
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    },
  });
}
