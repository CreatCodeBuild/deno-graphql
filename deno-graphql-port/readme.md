# GraphQL Deno Port
Run GraphQL in Deno

```
import graphql from "https://creatcodebuild.github.io/graphql-projects/deno-graphql-port/dist/graphql.js";
// or
import { default as graphql } from "https://creatcodebuild.github.io/graphql-projects/deno-graphql-port/dist/graphql.js";
```
to use the library.

The whole GraphQL project is compiled to a single file through Webpack. All exported names in the `graphql` NodeJS library are exposed in the `default`.

For example
```
graphql.graphql
```
is the original `graphql` function. See doc: https://graphql.org/graphql-js/#writing-code
