import {
    GraphQLResolveInfo,
    OperationTypeNode,
    OperationDefinitionNode,
} from "graphql";
import {
    CompileRemoteSelectionSet,
    compileTypeNode
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
    for (let [remoteField, infosOfTheSameEntry] of Object.entries(infos)) {
        for (let [i, info] of Object.entries(infosOfTheSameEntry)) {
            yield remoteField + String(i) + ':';
            yield* CompileRemoteSelectionSet(info, remoteField, {
                info, separator, usedFragments: new Set()
            });
            yield separator;
        }
    }
    yield '}';
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