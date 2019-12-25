[中文](./readme-chinese.md)

# GraphQL Remote Type
`remote-graph` is a library that helps you to execute remote GraphQL resolvers in a remote schema as if they are local and is build on top of [graphql-js](https://github.com/graphql/graphql-js).

In contrast of [Apollo Federation](https://www.apollographql.com/docs/apollo-server/federation/introduction/), it needs __zero modification__ of your local schema nor any modification of the remote schema.

As a byproduct, the __zero-modification__ principle enables you to merge 3rd party schemas, which you do not own, into your schema. Therefore, your frontend or mobile clients can treat in-house schema and 3rd party schemas as one unified API.

## Example
The example below merges 3 public GraphQL schema into one. They are:
1. https://graphql-explorer.githubapp.com/graphql/proxy (GitHub)
2. https://countries.trevorblades.com/
3. https://graphql.anilist.co/

First, you import several helper functions from `RemoteResolver.js`.
```js
// Part 1
import { RemoteResolver, MapArgument, Transport } from '../RemoteResolver'; // This Lib
import { HTTP } from '../Transport';                                // This Lib

import { buildSchema, graphql } from 'graphql';
```
Second, define your schema. If you want to use parts of a remote schema, define those parts in your local schema.
```js
// Part 2
let source = `
    type Query {
        me: MeOnGithub!                         # GitHub
        countries(byName: String): [Country]    # https://countries.trevorblades.com/
        getAnimes(sort: [MediaSort]): Media     # https://graphql.anilist.co/
    }
    
    # GitHub 
    # Notice GitHub GraphQL doesn't have this type. It is renamed from GitHub's "User"
    # With this library, you can freely rename remote types.
    type MeOnGithub {
        login: String
    }

    # https://countries.trevorblades.com/
    type Country {
        name: String
    }

    # https://graphql.anilist.co/
    enum MediaSort {
        SCORE
        POPULARITY
    }
    type Media {
        id: Int
        isAdult: Boolean
        title: MediaTitle
    }
    type MediaTitle {
        romaji: String
        native: String
    }
`;
let schema = buildSchema(source);
```
Third, define remote resolvers. 
```js
// Part 3
async function ResolverFactory() {

    const viewers = await RemoteResolver(
        HTTP(
            'https://graphql-explorer.githubapp.com/graphql/proxy',
            {
                cookie:         'needed for GitHub auth',
                'X-CSRF-Token': 'needed for GitHub auth',
            },
            "include",
        ),
        `query`,
        `viewer`);
```
`RemoteResolver(transport: Transport, operationName: string, remoteField: string)` constructs a resolver that will automatically resolve remote data.

`Transport` is an interface which locates the remote schema. You can implement a different transport if you don't use HTTP.

`operationName` and `remoteField` define the entry point of the remote field/resolver/type. For example, you can issue a `query { user { shoppingCart { items } } }` to `domain1.com/gql`, where `shoppingCart` returns a `ShoppingCart` type that is in another schema/server `domain2.com/gql`. The remote schema may look like
```graphql
type Query {
    getShoppingCartByUserId(id: ID): ShoppingCart
}
type ShoppingCart {
    items: String
}
```
`getShoppingCartByUserId` is the entry point of `ShoppingCart` type. Therefore, you can define your remote resolver in `domain1.com/gql` as
```js
let resolvers = {
    user: {
        shoppingCart: await RemoteResolver(HTTP('domain2.com/gql'), `query`, `getShoppingCartByUserId`)
    }
}
```
Now let's fill up other remote resolvers.
```js
// Part 4
    const countries = await RemoteResolver(
        HTTP('https://countries.trevorblades.com/'),
        `query`,
        `countries`);

    const Media = await RemoteResolver(
        HTTP('https://graphql.anilist.co/'),
        'query',
        'Media'
    );

    return {
        // GitHub, mapped `query{me{...}}` to GitHub `query{viewer{...}}` to 
        me: viewers,
        countries: async function (args, ctx, info) {
            const remoteResult = await countries(args, ctx, MapArgument(info, {}));
            if (Object.keys(args).length > 0) {
                return remoteResult.filter((country) => {
                    return country.name.includes(args.byName);
                });
            }
            return remoteResult;
        },
        getAnimes: Media,
    };
}
```
Here is another feature of `RemoteResolver`. In `https://countries.trevorblades.com/`, `query { countries {...} }` has no arguments. There is no way to filter output. You can modify your local schema to allow arguments for this field. That's why we defined
```graphql
type Query {
    countries(byName: String): [Country]    # https://countries.trevorblades.com/
}
```
We can do apply the arguments after we get data from remote. `RemoteResolver` allows you to have imperative fine control over your resolvers.
```js
countries: async function (args, ctx, info) {
    const remoteResult = await countries(args, ctx, MapArgument(info, {}));
    if (Object.keys(args).length > 0) {
        return remoteResult.filter((country) => {
            return country.name.includes(args.byName);
        });
    }
    return remoteResult;
},
```
Now, let put everything together and issue queries to 3 remote schema as if they are 1 local schema.
```js
async function f() {
    let res = await graphql(schema,
        `
        query ($sort: MediaSort) { 
            me { 
                login
            }
            countries(byName: "ina") {
                name
            }
            getAnimes(sort: [$sort]) {
                id
                isAdult
                title {
                  romaji
                  native
                }
            }           
        }
        `,
        await ResolverFactory(),
        null, // context
        {"sort": "SCORE"}
    );
    console.log(res.data);
    console.log(res.errors);
}
f();
```

## Nice Features
1. Batching Remote Queries  
If you have a query `query { x y z }` where `x` and `y` belong to the same remote server, this lib will compile only 1 remote query that batches them together. Batching happens automatically and __zero-configuration__ is needed.

## Todo
1. Full query language support. `RemoteResolver` does not support full GraphQL query language yet. For example, it does not support Fragments and Interface.
2. Add `@remote` directive to allow better ahead of time type checking, readability. An draft design is
```
type Query {
    me: User
}
type User @remote(url: "github.com/graphql-api", entry: "Query.viewer") {
    login:  String
    age:    Int @local  # should allow local schema to expand a remote type.
}
```
3. `Mutation` has no semantic difference with `Query` so it's already supported. I need to think about how to support `Subscription`.
4. Remote schema auto generation. Instead of copy & paste remote schema into your local. Maybe I should write a tool to generate schema language source from the introspected schema.
5. Somebody please comes out a better name for this library.