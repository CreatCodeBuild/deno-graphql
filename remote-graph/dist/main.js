const { graphql, buildSchema } = require('graphql');
const fetch = require('node-fetch');
const fs = require('fs').promises;
let source = `
    type Query {
        demoField: DemoType
    }

    type DemoType @remote(source: "go") {
        x: Int
    }

    directive @remote(source: String!) on OBJECT
`;
let schema = buildSchema(source);
async function DemoType() {
    let ret = await fetch('http://localhost:8080/query', {
        method: "POST",
        body: JSON.stringify({
            query: `{
                demoField {
                  x
                }
              }
            `
        })
    });
    // console.log(await ret.json());
    let res = await ret.json();
    return res.data.demoField;
}
async function RemoteType(typeName) {
    // load remote schema
    let query = await fs.readFile('D:\\Projects\\deno-gql\\remote-graph\\IntrospectionQuery.gql', 'utf-8');
    let ret = await fetch('http://localhost:8080/query', {
        method: "POST",
        body: JSON.stringify({
            query: query
        })
    });
    let body = await ret.json();
    let schema = body.data;
    // parse current selection set
    // compose remote graphql query
    // return remote data
    return () => {
        console.log(arguments);
    };
}
async function main() {
    let root = {
        // demoField: async () => {
        //     return await DemoType()
        // }
        demoField: await RemoteType('DemoType')
    };
    graphql(schema, `{ demoField { x } }`, root)
        .then((res) => {
        console.log(res);
    });
}
main().then(() => {
});
//# sourceMappingURL=main.js.map