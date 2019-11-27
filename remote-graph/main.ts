const { graphql, buildSchema } = require('graphql');
const fetch = require('node-fetch');
const fs = require('fs').promises;

let source = `
    type Query {
        books: [Book]
    }

    type Book @remote(source: "go") {
        title: String
    }

    directive @remote(source: String!) on OBJECT
`

let schema = buildSchema(source);

async function RemoteType(typeName: String) {

    // load remote schema
    let query = await fs.readFile(
        'D:\\Projects\\deno-gql\\remote-graph\\IntrospectionQuery.gql',
        'utf-8'
    );

    let ret = await fetch('http://localhost:4000', {
        method: "POST",
        body: JSON.stringify({
            query: query
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
        // demoField: async () => {
        //     return await DemoType()
        // }
        books: await RemoteType('Book')
    }

    let res = await graphql(schema, `{ books { title } }`, root);
    console.log(res);
}
main();
