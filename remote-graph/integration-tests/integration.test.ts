import { RemoteType, FilterArgument, OverrideArgument, Transport } from '../RemoteType';
import { HTTP } from '../Transport';
import { buildSchema, graphql } from 'graphql';
import { strictEqual, deepEqual } from 'assert';

describe('All', async () => {
    let source = `
    type Query {
        countries(byName: String): [Country]
        china: Country
    }
    type Country {
        name: String
    }
    `;

    let schema = buildSchema(source);

    async function ResolverFactory() {

        const countries = await RemoteType(
            HTTP('https://countries.trevorblades.com/'),
            `query`,
            `countries`);

        const country = await RemoteType(
            HTTP('https://countries.trevorblades.com/'),
            `query`,
            `country`);

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
            china: async function(args, ctx, info) {
                return await country(null, ctx, OverrideArgument(info, {code: "CN"}));
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

        deepEqual(res,
            {
                "data": {
                    "countries": [
                        { "name": "Argentina" },
                        { "name": "Bosnia and Herzegovina" },
                        { "name": "Burkina Faso" },
                        { "name": "China" },
                        { "name": "Suriname" }
                    ],
                    "china": {
                        "name": "China"
                    }
                }
            }
        )
    });
});
