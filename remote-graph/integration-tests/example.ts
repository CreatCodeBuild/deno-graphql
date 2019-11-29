import { RemoteType, MapArgument, Transport } from '../RemoteType';
import { HTTP } from '../Transport';
import { buildSchema, graphql } from 'graphql';

let source = `
type Query {
    countries(byName: String): [Country]
    me: MeOnGithub!
    getAnimes(sort: Sort): Media
}
enum Sort {
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
        `countries`);

    // const viewers = await RemoteType(
    //     HTTP(
    //         'https://graphql-explorer.githubapp.com/graphql/proxy',
    //         {
    //             cookie: '',
    //             'X-CSRF-Token': ''
    //         },
    //         "include",
    //     ),
    //     `query`,
    //     `viewer`);

    const Media = await RemoteType(
        HTTP('https://graphql.anilist.co/'),
        'query',
        'Media'
    );

    return {
        countries: async function (args, ctx, info) {
            const remoteResult = await countries(args, ctx, MapArgument(info, {}));
            if (Object.keys(args).length > 0) {
                return remoteResult.filter((country) => {
                    return country.name.includes(args.byName);
                });
            }
            return remoteResult;
        },
        // me: viewers,
        getAnimes: Media,
    };
}

async function f() {
    let res = await graphql(schema,
        `
        query { 
            # me { 
            #     login
            # }
            #countries(byName: "ina") {
            #    name
            #}
            getAnimes(sort: SCORE) {
                id
                isAdult
                title {
                  romaji
                  native
                }
            }           
        }
        `,
        await ResolverFactory());
    console.log(res.data);
    console.log(res.errors);
}
f();
