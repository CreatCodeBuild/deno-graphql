import {
    GraphQLResolveInfo,
    OperationTypeNode,
    OperationDefinitionNode,
    FragmentDefinitionNode
} from "graphql";
import {
    CompileRemoteSelectionSet,
    compileTypeNode,
    compileFragmentDefinitionNode
} from './Compile';

type Separator = ' ' | ',';

type Infos = { [key: string]: GraphQLResolveInfo[] };

export function CompileRemoteQueries(infos: Infos, operationName: OperationTypeNode, separator?: Separator) {
    if (!separator) { separator = ','; }
    return Array.from(compileRemoteQueries(infos, operationName, separator)).join('');
}

function* compileRemoteQueries(infos: Infos, operationName: OperationTypeNode, separator: Separator) {
    yield operationName;
    const operations = [];
    for (let [remoteField, infosOfTheSameEntry] of Object.entries(infos)) {
        for (let info of infosOfTheSameEntry) {
            operations.push(info.operation);
        }
    }
    yield* compileOperationsVariables(operations);
    yield '{';

    let anyInfo: any;
    const usedFragments = new Set<FragmentDefinitionNode>();
    for (let [remoteField, infosOfTheSameEntry] of Object.entries(infos)) {
        for (let [i, info] of Object.entries(infosOfTheSameEntry)) {
            anyInfo = info;
            yield remoteField + String(i) + ':';
            const meta = { info, separator, usedFragments };
            yield* CompileRemoteSelectionSet(info, remoteField, meta);
            yield separator;
        }
    }
    yield '}';
    // fragments
    for(let fragment of usedFragments) {
        yield* compileFragmentDefinitionNode(fragment, {info: anyInfo, separator, usedFragments});
    }
}

function* compileOperationsVariables(operations: OperationDefinitionNode[]) {
    if (operations.length === 0) {
        return;
    }
    let noVars = true;
    for (let op of operations) {
        if (op.variableDefinitions.length > 0) {
            noVars = false;
            break;
        }
    }
    if (noVars) {
        return;
    }
    const variableNames = {};
    yield '(';
    for (let op of operations) {
        for (let variableDefinition of op.variableDefinitions) {
            if (variableDefinition.variable.name.value in variableNames) {
                break;
            }
            variableNames[variableDefinition.variable.name.value] = null;
            yield '$';
            yield variableDefinition.variable.name.value;
            yield ':';
            yield* compileTypeNode(variableDefinition.type);
        }
    }
    yield ')';
}