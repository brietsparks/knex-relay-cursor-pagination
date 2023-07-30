import { IFieldResolver } from '@graphql-tools/utils';

import * as schema from './schema';
import { Service } from './service';

export function createResolvers(service: Service) {
  const getPosts: IFieldResolver<unknown, unknown, schema.QueryPostsArgs> = (_, { first, after, last, before }) => {
    return service.postsProvider.getPosts({
      pagination: {
        first,
        after,
        before,
        last,
      }
    });
  };

  const Post = {
    id: p => p.id,
    title: p => p.title,
    creationTimestamp: p => p.creation_timestamp,
  };

  return {
    Post,
    Query: {
      posts: getPosts
    },
  };
}
