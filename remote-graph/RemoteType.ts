import {
    GraphQLResolveInfo,
    OperationTypeNode,
    introspectionQuery,
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
    GraphQLList
} from "graphql";
export { CompileRemoteQueries } from './BatchCompile';
import { CompileRemoteQueries } from './BatchCompile';
export { CompileRemoteSelectionSet, CompileRemoteQuery } from './Compile';
import { CompileRemoteQuery } from './Compile';

import * as DataLoader from 'dataloader';

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

export function OverrideArgument(info: GraphQLResolveInfo, args: any): GraphQLResolveInfo {
    function typeOf(v): GraphQLInputType {
        switch (typeof (v)) {
            case 'boolean':
                return GraphQLBoolean;
            case 'string':
                return GraphQLString;
            case 'number':
                return GraphQLFloat;
        }
        if (v === null) {
            return null;
        }
        if (v instanceof Array) {
            return new GraphQLList(typeOf(v));
        }

        return undefined;
    }

    let newArgs: ArgumentNode[] = [];
    for (let [k, v] of Object.entries(args)) {
        const inputType: any = (function () {
            // todo: full implementation
            let t = typeOf(v);
            if (t !== undefined) {
                return t;
            }

            return GraphQLEnumType;
        })();
        const value = astFromValue(v, typeOf(v));
        console.log(v, typeof(v), value);
        newArgs.push({
            kind: 'Argument',
            name: { kind: 'Name', value: k },
            //
            value: value
        });
    }
    const newInfo = Object.assign(Object.create(null), info);
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
    const response2 = await transport.do(introspectionQuery);
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

export async function RemoteType(transport: Transport, operationName: OperationTypeNode, remoteField: string) {

    // load remote schema
    const response2 = await transport.do(introspectionQuery);
    const introspection: IntrospectionQuery = response2.data;
    // check if remoteField is in remote Operation root type.
    if (!validateRemoteField(introspection, operationName, remoteField)) {
        throw new Error(`${remoteField} does not exits in remote schema at ${transport.url}`);
    }

    return async function (args, ctx, info: GraphQLResolveInfo) {

        const remoteQuery = CompileRemoteQuery(info, operationName, remoteField);
        console.log(remoteQuery);
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
