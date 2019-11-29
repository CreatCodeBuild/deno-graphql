import { RemoteType, MapArgument, Transport } from '../RemoteType';
import { HTTP } from '../Transport';
import { buildSchema, graphql } from 'graphql';

let source = `
type Query {
    countries(byName: String): [Country]
    me: MeOnGithub!
}
type Country {
    name: String
}
type MeOnGithub {
    login: String
}
`;

let schema = buildSchema(source);

async function ResolverFactory() {

    const countries = await RemoteType(
        HTTP('https://countries.trevorblades.com/'),
        `query`,
        `countriesX`);

    return {
        countries: async function (args, ctx, info) {
            const remoteResult = await countries(args, ctx, MapArgument(info, {}));
            if(Object.keys(args).length > 0) {
                return remoteResult.filter((country) => {
                    return country.name.includes(args.byName);
                });
            }
            return remoteResult;
        },
        me: await RemoteType(
            HTTP(
                'https://graphql-explorer.githubapp.com/graphql/proxy',
                {
                    cookie: '',
                    'X-CSRF-Token': ''
                },
                "include",
            ),
            `query`,
            `viewer`)
    };
}

async function f() {
    let res = await graphql(schema,
        `
        query { 
            # me { 
            #     login
            # }
            countries(byName: "ina") {
                name
            }
        }
        `,
        await ResolverFactory());
    console.log(res.data);
    console.log(res.errors);
}
f();
