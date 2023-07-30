import { GenericContainer, StartedTestContainer } from 'testcontainers';

export type StartedPgTestContainer = StartedTestContainer;

export type CreatePgTestcontainerResult = [StartedPgTestContainer, PgConnectionParams];

export interface PgConnectionParams {
  host: string;
  user: string;
  database: string;
  password: string;
  port: number;
}

export async function createPgTestcontainer(): Promise<CreatePgTestcontainerResult> {
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

  const connectionParams = {
    ...containerParams,
    port: pgContainer.getMappedPort(5432)
  };

  return [pgContainer, connectionParams]
}
