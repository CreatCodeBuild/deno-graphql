import {
    GraphQLResolveInfo, 
    FieldNode,
    GraphQLFieldResolver,
    SelectionSetNode,
    OperationTypeNode
} from "graphql";

const fetch = require('node-fetch');

export function RemoteType(url: string, operationName: OperationTypeNode, remoteField: string) {

    // load remote schema
    // don't need to load remote schema for validation in the prototype

    // parse current selection set

    // compose remote graphql query

    // return remote data
    return async function(parent, args, info) {
        const remoteQuery = CompileRemoteQuery(info, operationName, remoteField);

        // do remote query
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                query: remoteQuery
            })
        });
        const body = await res.text();
        return JSON.parse(body).data[remoteField];
    }
}

type Separator = ' ' | ',';

export function CompileRemoteQuery(info: GraphQLResolveInfo,  operationName: OperationTypeNode, remoteField: string, separator?: Separator) {
    if(!separator) {
        separator = ',';
    }
    return `${operationName}{${remoteField}${CompileRemoteSelectionSet(info, separator)}}`;
} 

export function CompileRemoteSelectionSet(info: GraphQLResolveInfo | any, separator?: Separator): string {
    if(!separator) {
        separator = ',';
    }
    let tokens = [];
    if(info.fieldNodes.length !== 1) {
        throw new Error(`info.fieldNodes.length === ${info.fieldNodes.length}`);
    }
    tokens.push('{');
    tokens = tokens.concat(compileRemoteSelectionSet(info.fieldNodes[0].selectionSet, separator));
    tokens.push('}');
    return tokens.join('');
}

function compileRemoteSelectionSet(selectionSet: SelectionSetNode, separator: Separator) {
    let tokens = [];
    for(let selectionNode of selectionSet.selections) {
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
    if(!node.selectionSet) {
        return tokens;
    }
    tokens.push('{');
    tokens = tokens.concat(compileRemoteSelectionSet(node.selectionSet, separator));
    tokens.push('}');
    return tokens;
}
