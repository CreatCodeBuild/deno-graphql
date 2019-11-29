import { RemoteType, MapArgument } from '../RemoteType';
import { buildSchema, graphql } from 'graphql';

let source = `
type Query {
    countries(byName: String): [Country]
}
type Country {
    name: String
}
`;

let schema = buildSchema(source);

let root = {
    countries: async function(args, ctx, info) {
        const remoteResolver = RemoteType(
            'https://countries.trevorblades.com/',
            `query`,
            `countries`);
        const remoteResult = await remoteResolver(args, ctx, MapArgument(info, {}));
        return remoteResult.filter((country) => {
            return country.name.includes(args.byName);
        });
    }
};

async function f() {
    let res = await graphql(schema,
        `
        {
            countries(byName: "A") {
                name
            }
        }`,
        root);
    console.log(res.data);
    console.log(res.errors);
}
f();
