import { config as configureEnv } from 'dotenv';
import knex from 'knex';
import { ApolloServer } from 'apollo-server';
import { readFileSync } from 'fs';
import { GenericContainer } from 'testcontainers';
import pg from 'pg';


import { createResolvers } from './resolvers';
import { createService } from './service';

//
// run app
//
configureEnv();
getApolloServer()
  .then(s => s.listen())
  .then(r => console.log(`Server ready at ${r.url}`));


//
// dependencies bootstrapping
//
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
  const containerParams = {
    host: '127.0.0.1',
    user: 'root',
    database: 'root',
    password: 'password',
  };

  const pgContainer = await new GenericContainer('postgres')
    .withExposedPorts(5432)
    .withEnv('POSTGRES_PASSWORD', containerParams.password)
    .withEnv('POSTGRES_USER', containerParams.user)
    .withEnv('POSTGRES_DB', containerParams.database)
    .start();

  const db = knex({
    client: 'pg',
    migrations: {
      directory: `${__dirname}/migrations`,
    },
    connection: {
      port: pgContainer.getMappedPort(5432),
      host: containerParams.host,
      user: containerParams.user,
      password: containerParams.password,
      database: containerParams.database,
    },
  });

  await db.migrate.up();

  pg.types.setTypeParser(1184, (v: unknown) => v.toString()); // timestamptz

  return db;
}
