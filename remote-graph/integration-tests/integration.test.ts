import { RemoteResolver, FilterArgument, OverrideArgument, Transport } from '../RemoteResolver';
import { HTTP } from '../Transport';
import { buildSchema, graphql } from 'graphql';
import { strictEqual, deepEqual } from 'assert';

describe('All', async () => {
    let source = `
    type Query {
        countries(byName: String): [Country]
        china: Country
        Media: Media
    }
    type Country {
        name: String
    }

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

    async function ResolverFactory() {

        const countries = await RemoteResolver(
            HTTP('https://countries.trevorblades.com/'),
            `query`,
            `countries`);

        const country = await RemoteResolver(
            HTTP('https://countries.trevorblades.com/'),
            `query`,
            `country`);

        const Media = await RemoteResolver(
            HTTP('https://graphql.anilist.co/'),
            `query`,
            `Media`);

        return {
            countries: async function (args, ctx, info) {
                const remoteResult = await countries(null, ctx, FilterArgument(info, {}));
                if (Object.keys(args).length > 0) {
                    return remoteResult.filter((country) => {
                        return country.name.includes(args.byName);
                    });
                }
                return remoteResult;
            },
            china: async function (args, ctx, info) {
                return await country({code: 'CN'}, ctx, info);
            },
            Media: async function (args, ctx, info) {
                return await Media({sort: ['SCORE']}, ctx, info);
            }
        };
    }

    it('test 1', async () => {
        let res = await graphql(schema,
            `
            query { 
                countries(byName: "ina") {
                    name
                }
                china {
                    name
                }
            }
            `,
            await ResolverFactory(),
            null, // context
            { "sort": "SCORE" }
        );
        strictEqual(res.errors, undefined);
        deepEqual(res.data,
            {
                "countries": [
                    { "name": "Argentina" },
                    { "name": "Bosnia and Herzegovina" },
                    { "name": "Burkina Faso" },
                    { "name": "China" },
                    { "name": "Suriname" }
                ],
                "china": {
                    "name": "China"
                },
            }
        )
    });
});
