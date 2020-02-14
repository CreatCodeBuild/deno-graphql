import { GraphQLObjectType, GraphQLString } from 'graphql';

export class Maga {

}

// type GraphQLFieldConfig = {
//   type: GraphQLOutputType;
//   args?: GraphQLFieldConfigArgumentMap;
//   resolve?: GraphQLFieldResolveFn;
//   deprecationReason?: string;
//   description?: ?string;
// }

export function args(params: any) {

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) { // this is the decorator
        // do something with 'target' and 'value'...
        // return target
        console.log(target, target.constructor.name);
        console.log(propertyKey);
        console.log(params);
        // target.type = {
        //     name: target.name,
        //     fields:
        // };

        // todo: at least I know the approach now
        target.fields[propertyKey] = { type: GraphQLString };

        // console.log(target.fields);

    }

}

export function or(...types): any[] {
    return types
}

export function ret(type) {}

export function toSchema(name, fields) {

}
