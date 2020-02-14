import { GraphQLObjectType, GraphQLString } from 'graphql';

export class Maga {

}

type GraphQLFieldConfig = {
  type: any // GraphQLOutputType;
  args?: any // GraphQLFieldConfigArgumentMap;
//   resolve?: GraphQLFieldResolveFn;
//   deprecationReason?: string;
//   description?: ?string;
}

// type GraphQLArgumentConfig = {
//   type: GraphQLInputType;
//   defaultValue?: any;
//   description?: ?string;
// }

// interface Field {
//     args: any
//     type
// }

function schema(type: any) {
    console.log(type.prototype);
    return new GraphQLObjectType({
        name: type.name,
        // @ts-ignore
        fields: type.prototype._fields
    })
}

export function field(f: GraphQLFieldConfig) {

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) { // this is the decorator

        // todo: at least I know the approach now
        if(!target._fields) { target._fields = {} }
        console.log(f.type);
        if(!(f.type instanceof GraphQLObjectType)) { // check other GraphQL type as well
            f.type = schema(f.type);
        }
        target._fields[propertyKey] = f;

        // console.log(target.fields);

    }

}

export function or(...types): any[] {
    return types
}

export function ret(type) {}

export function toSchema(name, fields) {

}
