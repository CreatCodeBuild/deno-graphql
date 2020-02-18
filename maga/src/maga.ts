import {
    GraphQLFieldConfig,
    GraphQLFieldConfigArgumentMap,
    GraphQLObjectType,
    GraphQLOutputType,
    GraphQLScalarType
} from 'graphql';

export class Maga {

}

export function schema(type: any) {
    return new GraphQLObjectType({
        name: type.name,
        // @ts-ignore
        fields: type.prototype._fields
    })
}

export function field<TSource, TContext, TArgs>(f: GraphQLFieldConfig<TSource, TContext, TArgs>) {

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) { // this is the decorator
        // todo: at least I know the approach now
        if (!target._fields) { target._fields = {} }
        if (!(
            f.type instanceof GraphQLObjectType ||
            f.type instanceof GraphQLScalarType
        )) { // check other GraphQL type as well
            f.type = schema(f.type);
        }
        target._fields[propertyKey] = f;
    }

}

export function or(...types): any[] {
    return types
}

export function ret(type) { }

export function toSchema(name, fields) {

}
