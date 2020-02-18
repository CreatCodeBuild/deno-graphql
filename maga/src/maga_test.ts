import { Maga, field, or, schema } from './maga';

import {
    printType,
    printSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLInt,
    GraphQLSchema
} from 'graphql';

import { equal } from 'assert';

class User {
    @field({
        type: GraphQLInt
    })
    id() { }

    @field({
        type: GraphQLString
    })
    name() {}
}

class Query {
    @field({
        args: {
            id: GraphQLString,
            name: {
                type: GraphQLInt
            }
        },
        type: schema(User)
    })
    getUser(args, ctx, info) {

    }
}

describe('Generate Correct Schema', () => {

    const schemaSource = `type Query {
  getUser(id: String, name: Int): User
}

type User {
  id: Int
  name: String
}
`

    const schemaAST = new GraphQLSchema({
        query: schema(Query)
    });

    it('test 1', () => {
        // console.log(printSchema(schemaAST));
        equal(schemaSource, printSchema(schemaAST));
    })

})
