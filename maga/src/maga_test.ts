import { Maga, field, or } from './maga';

import { printType, GraphQLObjectType, GraphQLString, GraphQLInt } from 'graphql';

class User {
    @field({
        type: GraphQLInt
    })
    id() {}
}

class Query {
    @field({
        // args: {
        //     id: {
        //         type: GraphQLString
        //     },
        //     name: {
        //         type: GraphQLInt
        //     }
        // },
        type: schema(User)
    })
    getUser(args, ctx, info) {

    }
}

function schema(type: any) {
    return new GraphQLObjectType({
        name: type.name,
        // @ts-ignore
        fields: type.prototype._fields
    })
}

console.log(printType(schema(Query)));
