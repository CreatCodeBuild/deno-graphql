import {
    GraphQLResolveInfo,
    FieldNode,
    SelectionSetNode,
    TypeNode,
    ValueNode,
    ArgumentNode,
    OperationDefinitionNode,
} from "graphql";

type Separator = ' ' | ',';

export function CompileRemoteSelectionSet(info: GraphQLResolveInfo, remoteField: string, separator: Separator): string[] {
    let tokens = [];
    tokens.push(remoteField);
    // arguments
    tokens = tokens.concat(Array.from(compileArguments(info.fieldNodes[0].arguments)));
    if (info.fieldNodes.length !== 1) {
        throw new Error(`info.fieldNodes.length === ${info.fieldNodes.length}`);
    }
    tokens.push('{');
    tokens = tokens.concat(compileRemoteSelectionSet(info.fieldNodes[0].selectionSet, separator));
    tokens.push('}');
    return tokens;
}


export function compileRemoteSelectionSet(selectionSet: SelectionSetNode, separator: Separator) {
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

export function* compileTypeNode(typeNode: TypeNode) {
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

export function* compileValueNode(value: ValueNode) {
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

export function* compileOperationVariables(operation: OperationDefinitionNode) {
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
