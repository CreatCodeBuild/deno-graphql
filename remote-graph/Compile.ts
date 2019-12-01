import {
    OperationTypeNode,
    GraphQLResolveInfo,
    FieldNode,
    SelectionSetNode,
    TypeNode,
    ValueNode,
    ArgumentNode,
    OperationDefinitionNode,
    FragmentSpreadNode,
    FragmentDefinitionNode,
} from "graphql";

type Separator = ' ' | ',';

interface Meta {
    readonly info: GraphQLResolveInfo
    readonly separator: Separator
    usedFragments: Set<FragmentDefinitionNode>
}

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
    const usedFragments = new Set<FragmentDefinitionNode>();
    const meta = {info, separator, usedFragments};
    tokens = tokens.concat(CompileRemoteSelectionSet(info, remoteField, meta));
    tokens.push('}');
    // fragments
    for(let fragment of usedFragments) {
        tokens = tokens.concat(Array.from(compileFragmentDefinitionNode(fragment, meta)))
    }
    return tokens.join('');
}

function* compileFragmentDefinitionNode(fragment: FragmentDefinitionNode, meta: Meta) {
    yield 'fragment';
    yield meta.separator;
    yield fragment.name.value;
    yield meta.separator;
    yield 'on';
    yield meta.separator;
    yield fragment.typeCondition.name.value;
    yield* compileRemoteSelectionSet(fragment.selectionSet, meta);
}

export function CompileRemoteSelectionSet(info: GraphQLResolveInfo, remoteField: string, meta: Meta): string[] {
    let tokens = [];
    tokens.push(remoteField);
    // arguments
    tokens = tokens.concat(Array.from(compileArguments(info.fieldNodes[0].arguments)));
    if (info.fieldNodes.length !== 1) {
        throw new Error(`info.fieldNodes.length === ${info.fieldNodes.length}`);
    }
    tokens = tokens.concat(
        Array.from(compileRemoteSelectionSet(info.fieldNodes[0].selectionSet, meta))
    );
    return tokens;
}


export function* compileRemoteSelectionSet(
    selectionSet: SelectionSetNode,
    meta: Meta
) {
    if(selectionSet.selections.length === 0) {
        return;
    }
    yield '{';
    for (let selectionNode of selectionSet.selections) {
        switch (selectionNode.kind) {
            case 'Field':
                yield* compileFieldNode(selectionNode, meta);
                break;
            case 'FragmentSpread':
                // todo
                yield* compileFragmentSpread(selectionNode, meta);
                break;
            default:
                throw new Error(`doesn't support ${selectionNode.kind} yet`);
        }
        yield meta.separator;
    }
    yield '}';
}

// compiles fragmentt spread in its source form and notify caller which fragment was used
function* compileFragmentSpread(node: FragmentSpreadNode, meta: Meta) {
    yield `...${node.name.value}`;
    meta.usedFragments.add(meta.info.fragments[node.name.value]);
}

export function compileFieldNode(node: FieldNode, meta: Meta): string[] {
    let tokens = [];
    const fieldName = node.name.value;
    tokens.push(fieldName);
    if (!node.selectionSet) {
        return tokens;
    }
    tokens = tokens.concat(
        Array.from(compileRemoteSelectionSet(node.selectionSet, meta))
    );
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
    if (operation.variableDefinitions.length === 0) {
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
