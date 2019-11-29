import {
    GraphQLResolveInfo,
    FieldNode,
    SelectionSetNode,
    OperationTypeNode,
    OperationDefinitionNode,
    ArgumentNode,
    TypeNode,
    ValueNode,
    introspectionQuery,
    IntrospectionQuery
} from "graphql";

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
        console.log(remoteQuery, info.variableValues);
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
    tokens.push(remoteField);
    // arguments
    tokens = tokens.concat(Array.from(compileArguments(info.fieldNodes[0].arguments)));
    // selection set
    tokens = tokens.concat(CompileRemoteSelectionSet(info, separator));
    tokens.push('}');
    return tokens.join('');
}

function* compileOperationVariables(operation: OperationDefinitionNode) {
    if(operation.variableDefinitions.length === 0) {
        return;
    }
    yield '(';
    for (let variableDefinition of operation.variableDefinitions) {
        yield '$';
        yield variableDefinition.variable.name.value;
        yield ':';
        yield* compileTypeNode(variableDefinition.type);
    }
    yield ')'
}

function* compileTypeNode(typeNode: TypeNode) {
    switch (typeNode.kind) {
        case 'ListType':
            yield '[';
            yield* compileTypeNode(typeNode.type);
            yield ']';
            break;
        case 'NamedType':
            yield typeNode.name.value;
            break;
        default:
            throw new Error(`${typeNode.kind} is not supported yet`);
    }
}

type ArgumentNodes = readonly ArgumentNode[];
function* compileArguments(args: ArgumentNodes) {
    if (args.length === 0) {
        return;
    }
    yield '(';
    for (let arg of args) {
        yield arg.name.value;
        yield ':';
        // switch on type
        yield* compileValueNode(arg.value);
        yield ',';
    }
    yield ')';
}

function* compileValueNode(value: ValueNode) {
    switch (value.kind) {
        case 'IntValue':
            yield value.value;
            break;
        case 'StringValue':
            yield '"';
            yield value.value;
            yield '"';
            break;
        case 'EnumValue':
            yield value.value;
            break;
        case 'ListValue':
            yield '['
            for (let v of value.values) {
                yield* compileValueNode(v);
            }
            yield ']'
            break;
        case 'ObjectValue':
            yield '{';
            for (let field of value.fields) {
                yield field.name.value;
                yield ':';
                yield* compileValueNode(field.value);
                yield ',';
            }
            yield '}';
            break;
        case 'Variable':
            yield '$';
            yield value.name.value;
            break;
        default:
            throw new Error(`${value.kind} is not supported yet`);
    }
}

export function CompileRemoteSelectionSet(info: GraphQLResolveInfo | any, separator?: Separator): string[] {
    if (info.fieldNodes.length !== 1) {
        throw new Error(`info.fieldNodes.length === ${info.fieldNodes.length}`);
    }
    if (!separator) {
        separator = ',';
    }
    let tokens = [];
    tokens.push('{');
    tokens = tokens.concat(compileRemoteSelectionSet(info.fieldNodes[0].selectionSet, separator));
    tokens.push('}');
    return tokens;
}

function compileRemoteSelectionSet(selectionSet: SelectionSetNode, separator: Separator) {
    let tokens = [];
    for (let selectionNode of selectionSet.selections) {
        switch (selectionNode.kind) {
            case 'Field':
                const subTokens = compileFieldNode(selectionNode, separator);
                tokens = tokens.concat(subTokens);
                break;
            default:
                throw new Error(`doesn't support ${selectionNode.kind} yet`);
        }
        tokens.push(separator);
    }
    return tokens;
}

export function compileFieldNode(node: FieldNode, separator: Separator): string[] {
    let tokens = [];
    const fieldName = node.name.value;
    tokens.push(fieldName);
    if (!node.selectionSet) {
        return tokens;
    }
    tokens.push('{');
    tokens = tokens.concat(compileRemoteSelectionSet(node.selectionSet, separator));
    tokens.push('}');
    return tokens;
}
