import {
    buildClientSchema,
    buildASTSchema,
    getIntrospectionQuery,
    GraphQLSchema,
    GraphQLResolveInfo,
    OperationTypeNode,
    IntrospectionQuery,
    ArgumentNode,
    ValueNode,
    astFromValue,
    GraphQLScalarType,
    GraphQLEnumType,
    GraphQLBoolean,
    GraphQLString,
    GraphQLInt,
    GraphQLNonNull,
    GraphQLFloat,
    GraphQLInputType,
    GraphQLList,
    IntrospectionInputValue
} from "graphql";
export { CompileRemoteQueries } from './BatchCompile';
import { CompileRemoteQueries } from './BatchCompile';
export { CompileRemoteSelectionSet, CompileRemoteQuery } from './Compile';
import { CompileRemoteQuery } from './Compile';

import * as DataLoader from 'dataloader';
import { Schema } from "inspector";

export function FilterArgument(info: GraphQLResolveInfo, args: any): GraphQLResolveInfo {
    let newArgs = [];
    for (let arg of info.fieldNodes[0].arguments) {
        if (arg.name.value in args) {
            newArgs.push(arg);
        }
    }
    const newInfo = Object.assign(Object.create(null), info);
    newInfo.fieldNodes[0].arguments = newArgs;
    return newInfo;
}

export function OverrideArgument(
    info: GraphQLResolveInfo,
    args: any,
    operation: OperationTypeNode,
    remoteField: string,
    remoteSchema: GraphQLSchema
): GraphQLResolveInfo {
    if (args === undefined || args === null) {
        return info;
    }
    function typeOf(argName: string, value: any) {
        const type = (() => {
            if (operation === 'query') {
                return remoteSchema.getQueryType();
            } else if (operation === 'mutation') {
                return remoteSchema.getMutationType();
            } else {
                return remoteSchema.getSubscriptionType();
            }
        })();
        if (type.getFields()[remoteField] === undefined) {
            // todo: should tell which remote resource has this problem
            throw new Error(`remote field ${remoteField} does not exist in ${operation}`);
        }
        for (let arg of type.getFields()[remoteField].args) {
            if (arg.name === argName) {
                return arg.type;
            }
        }
        throw new Error('todo: to be honest I dont know what to throw');
    };
    let newArgs: ArgumentNode[] = [];
    for (let [k, v] of Object.entries(args)) {
        const value = astFromValue(v, typeOf(k, v));
        newArgs.push({
            kind: 'Argument',
            name: { kind: 'Name', value: k },
            value: value
        });
    }
    info.variableValues
    const newInfo = Object.assign(Object.create(null), info); // todo: consider deep clone
    newInfo.fieldNodes[0].arguments = newArgs;
    return newInfo;
}

type VariableValues = { [variableName: string]: any };
export interface Transport {
    do(remoteQuery: string, variables?: VariableValues)
    url: string
}


export async function BatchedRemoteType(transport: Transport, operationName: OperationTypeNode, remoteField: string) {

    // load remote schema
    const response2 = await transport.do(getIntrospectionQuery());
    const introspection: IntrospectionQuery = response2.data;
    // check if remoteField is in remote Operation root type.
    if (!validateRemoteField(introspection, operationName, remoteField)) {
        throw new Error(`${remoteField} does not exits in remote schema at ${transport.url}`);
    }

    type resolverSignature = { args, ctx, info: GraphQLResolveInfo };

    const loader = new DataLoader(async (resolves: resolverSignature[]) => {

        let infos = [];
        for (let resovlerParams of resolves) {
            infos.push(resovlerParams.info);
        }

        const remoteQuery = CompileRemoteQueries({ [remoteField]: infos }, operationName, ',')

        // do transport
        // each info has the same variableValues because they belong to the same query document.
        const response = await transport.do(remoteQuery, infos[0].variableValues)
        if (response.errors) {
            throw new Error(response.errors);
        }
        // dispatch result back as an array
        return Object.entries(response.data).map(([fieldAlias, data]) => data);
    })

    return async function (args, ctx, info: GraphQLResolveInfo) {
        return loader.load({ args, ctx, info });
    }
}

export async function RemoteResolver(transport: Transport, operation: OperationTypeNode, remoteField: string) {

    // load remote schema
    const response = await transport.do(getIntrospectionQuery());
    const introspection: IntrospectionQuery = response.data;
    const remoteSchema = buildClientSchema(introspection);

    // check if remoteField is in remote Operation root type.
    if (!validateRemoteField(introspection, operation, remoteField)) {
        throw new Error(`${remoteField} does not exits in remote schema at ${transport.url}`);
    }

    return async function (args, ctx, info: GraphQLResolveInfo) {
        // const types = FindArgumentTypeOf(operation, info.fieldName, introspection)
        info = OverrideArgument(info, args, operation, remoteField, remoteSchema);
        const remoteQuery = CompileRemoteQuery(info, operation, remoteField);

        // do remote query
        const response = await transport.do(remoteQuery, info.variableValues)
        if (response.errors) {
            throw new Error(response.errors);
        }
        return response.data[remoteField];
    }
}

type OperationType = 'Query' | 'Mutation' | 'Subscription';
function validateRemoteField(introspection: IntrospectionQuery, operationName: OperationTypeNode, remoteField: string): boolean {
    let found = false;
    let operationType: OperationType = 'Query';
    switch (operationName) {
        case 'mutation':
            operationType = 'Mutation';
            break;
        case 'subscription':
            operationType = 'Subscription';
            break;
    }
    for (let type of introspection.__schema.types) {
        if (type.name === operationType) {
            if (type.kind === 'OBJECT') {
                for (let field of type.fields) {
                    if (field.name === remoteField) {
                        found = true;
                        break;
                    }
                }
            }
        }
        if (found) {
            break;
        }
    }
    return found;
}

// function* FindArgumentTypeOf(typeName: string, fieldName: string, introspection: IntrospectionQuery): Iterable<IntrospectionInputValue> {
//     for (let type of introspection.__schema.types) {
//         if (type.name !== typeName) {
//             continue;
//         }
//         if (type.kind !== 'OBJECT') {
//             throw new Error("to be honest I don't know how to describe");   // todo a better error message
//         }
//         for (let field of type.fields) {
//             for (let arg of field.args) {
//                 yield arg
//             }
//         }
//     }
// }
