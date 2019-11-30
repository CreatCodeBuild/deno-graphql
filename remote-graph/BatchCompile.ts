import {
    GraphQLResolveInfo,
    OperationTypeNode,
    OperationDefinitionNode,
} from "graphql";
import {
    CompileRemoteSelectionSet
} from './Compile';

type Separator = ' ' | ',';

type Infos = {[key: string]: GraphQLResolveInfo[] };

export function CompileRemoteQueries(infos: Infos, operationName: OperationTypeNode, separator?: Separator) {
    if (!separator) { separator = ','; }
    return Array.from(compileRemoteQueries(infos, operationName, separator)).join('');
}

function* compileRemoteQueries(infos: Infos, operationName: OperationTypeNode, separator: Separator) {
    yield operationName;
    // yield *compileOperationsVariables(infos.map( info => info.operation ))
    yield '{';
    for (let [remoteField, infosOfTheSameEntry] of Object.entries(infos)) {
        for(let [i, info] of Object.entries(infosOfTheSameEntry)) {
            yield remoteField+String(i)+':';
            yield *CompileRemoteSelectionSet(info, remoteField, separator);
            yield separator;
        }
    }
    yield '}';
}

// function* compileOperationsVariables(operations: OperationDefinitionNode[]) {
//     if(operations.length === 0) {
//         return;
//     }
//     yield '(';
//     for(let op of operations) {
//         for (let variableDefinition of op.variableDefinitions) {
//             yield '$';
//             yield variableDefinition.variable.name.value;
//             yield ':';
//             yield* compileTypeNode(variableDefinition.type);
//         }   
//     }
//     yield ')';
// }