# Knex Relay Cursor Pagination Example App

### Dependencies
- Node 16.19.0 or greater
- Docker

### Setup and run
Install Node dependencies:
```
yarn install
```

Run the app (this will run a Docker testcontainer for the database):
```
yarn start
```

Go to http://localhost:4000/graphql

Try it out with some queries:
```
query {
  posts(first: 3) {
    edges {
      cursor
      node {
        id
        creationTimestamp
        title
      }
    }
    pageInfo {
      startCursor
      endCursor
      hasPreviousPage
      hasNextPage
    }
  }
}
```


