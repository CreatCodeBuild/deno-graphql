const { graphql, buildSchema, IntrospectionQuery } = require('graphql');
const fetch = require('node-fetch');
const fs = require('fs').promises;

let source = `
    type Query {
        books: [Book]
    }
`

let schema = buildSchema(source);

async function RemoteType(url: string, operationName: 'query' | 'mutation', field: string) {

    // load remote schema
    let ret = await fetch('http://localhost:4000', {
        method: "POST",
        body: JSON.stringify({
            query: IntrospectionQuery
        }),
        headers: {
            'content-type': 'application/json'
        }
    })
    let body = await ret.text();
    body = JSON.parse(body);
    let schema = body.data;
    // parse current selection set

    // compose remote graphql query

    // return remote data
    return function(parent, args, info) {
        console.log(JSON.stringify(info));
        console.log(arguments);
    }
}

async function main() {
    let root = {
        books: await RemoteType('Book')
    }

    let res = await graphql(schema, `{ books { title } }`, root);
    console.log(res);
}
main();
