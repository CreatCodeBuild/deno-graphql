import {
    GraphQLResolveInfo,
    OperationTypeNode,
    introspectionQuery,
    IntrospectionQuery
} from "graphql";
export { CompileRemoteQueries } from './BatchCompile';
export { CompileRemoteSelectionSet } from './Compile';
import { 
    CompileRemoteSelectionSet,
    compileOperationVariables
} from './Compile';

export function MapArgument(info: GraphQLResolveInfo, args: any): GraphQLResolveInfo {
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

type VariableValues = { [variableName: string]: any };
export interface Transport {
    do(remoteQuery: string, variables?: VariableValues)
    url: string
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
        // do remote query
        const response = await transport.do(remoteQuery, info.variableValues)
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

type Separator = ' ' | ',';

export function CompileRemoteQuery(info: GraphQLResolveInfo, operationName: OperationTypeNode, remoteField: string, separator?: Separator) {
    if (info.fieldNodes.length !== 1) {
        throw new Error(`info.fieldNodes.length === ${info.fieldNodes.length}`);
    }
    if (!separator) {
        separator = ',';
    }
    let tokens = [];
    tokens.push(operationName);
    // variables
    tokens = tokens.concat(Array.from(compileOperationVariables(info.operation)));

    tokens.push('{');
    // selection set
    tokens = tokens.concat(CompileRemoteSelectionSet(info, remoteField, separator));
    tokens.push('}');
    return tokens.join('');
}
