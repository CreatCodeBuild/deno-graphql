import { RemoteResolver, FilterArgument, OverrideArgument, Transport } from '../RemoteResolver';
import { HTTP } from '../Transport';
import { buildSchema, graphql } from 'graphql';
import { strictEqual, deepEqual } from 'assert';

describe('All', async () => {
    let source = `
    type Query {
        countries(byName: String): [Country]
        china: Country
        country(code: String): Country
    }
    type Country {
        name: String
        continent: Continent
    }
    type Continent {
        code: String
        name: String
        countries: [Country]
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
                return await country({ code: 'CN' }, ctx, info);
            },
            country: country,
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
                    name2: name
                }
                china2: china {
                    continent {
                        name2: name
                    }
                }
                country1: country(code: "US") {
                    name1: name
                    continent {
                        name
                    }
                }
                country2: country(code: "CN") {
                    name2: name
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
                    "name2": "China",
                },
                "china2": {
                    "continent": {
                        "name2": "Asia"
                    }
                },
                "country1": {
                    "continent": {
                        "name": "North America"
                    },
                    "name1": "United States"
                },
                "country2": {
                    "name2": "China"
                }
            }
        )
    });
});
