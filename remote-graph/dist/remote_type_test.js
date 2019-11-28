"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const fs = require('fs').promises;
const assert = require('assert');
const data1 = {
    "fieldName": "books",
    "fieldNodes": [
        {
            "kind": "Field",
            "name": {
                "kind": "Name",
                "value": "books",
                "loc": {
                    "start": 2,
                    "end": 7
                }
            },
            "arguments": [],
            "directives": [],
            "selectionSet": {
                "kind": "SelectionSet",
                "selections": [
                    {
                        "kind": "Field",
                        "name": {
                            "kind": "Name",
                            "value": "title",
                            "loc": {
                                "start": 10,
                                "end": 15
                            }
                        },
                        "arguments": [],
                        "directives": [],
                        "loc": {
                            "start": 10,
                            "end": 15
                        }
                    }
                ],
                "loc": {
                    "start": 8,
                    "end": 17
                }
            },
            "loc": {
                "start": 2,
                "end": 17
            }
        }
    ],
    "returnType": "[Book]",
    "parentType": "Query",
    "path": {
        "key": "books"
    },
    "schema": {
        "__validationErrors": [],
        "__allowedLegacyNames": [],
        "_queryType": "Query",
        "_directives": [
            "@remote",
            "@skip",
            "@include",
            "@deprecated"
        ],
        "_typeMap": {
            "Query": "Query",
            "Book": "Book",
            "String": "String",
            "__Schema": "__Schema",
            "__Type": "__Type",
            "__TypeKind": "__TypeKind",
            "Boolean": "Boolean",
            "__Field": "__Field",
            "__InputValue": "__InputValue",
            "__EnumValue": "__EnumValue",
            "__Directive": "__Directive",
            "__DirectiveLocation": "__DirectiveLocation"
        },
        "_possibleTypeMap": {},
        "_implementations": {}
    },
    "fragments": {},
    "rootValue": {},
    "operation": {
        "kind": "OperationDefinition",
        "operation": "query",
        "variableDefinitions": [],
        "directives": [],
        "selectionSet": {
            "kind": "SelectionSet",
            "selections": [
                {
                    "kind": "Field",
                    "name": {
                        "kind": "Name",
                        "value": "books",
                        "loc": {
                            "start": 2,
                            "end": 7
                        }
                    },
                    "arguments": [],
                    "directives": [],
                    "selectionSet": {
                        "kind": "SelectionSet",
                        "selections": [
                            {
                                "kind": "Field",
                                "name": {
                                    "kind": "Name",
                                    "value": "title",
                                    "loc": {
                                        "start": 10,
                                        "end": 15
                                    }
                                },
                                "arguments": [],
                                "directives": [],
                                "loc": {
                                    "start": 10,
                                    "end": 15
                                }
                            }
                        ],
                        "loc": {
                            "start": 8,
                            "end": 17
                        }
                    },
                    "loc": {
                        "start": 2,
                        "end": 17
                    }
                }
            ],
            "loc": {
                "start": 0,
                "end": 19
            }
        },
        "loc": {
            "start": 0,
            "end": 19
        }
    },
    "variableValues": {}
};
function compileRemoteQuery(info) {
    let tokens = [];
    tokens.push('{');
    for (const fieldNode of info.fieldNodes) {
        const subTokens = compileFieldNode(fieldNode);
        tokens = tokens.concat(subTokens);
    }
    tokens.push('}');
    return tokens.join('');
}
function compileFieldNode(node) {
    let tokens = [];
    const fieldName = node.name.value;
    tokens.push(fieldName);
    if (!node.selectionSet) {
        return tokens;
    }
    tokens.push('{');
    for (let selectionNode of node.selectionSet.selections) {
        switch (selectionNode.kind) {
            case 'Field':
                const subTokens = compileFieldNode(selectionNode);
                tokens = tokens.concat(subTokens);
                break;
            default:
                throw new Error(`doesn't support ${selectionNode.kind} yet`);
        }
        tokens.push(',');
    }
    tokens.push('}');
    return tokens;
}
async function Test() {
    assert.strictEqual(compileRemoteQuery(data1), `{books{title,}}`);
    assert.strictEqual(compileRemoteQuery(graphql_1.parse('{books{title,}}')), '{books{title,}}');
}
Test();
//# sourceMappingURL=remote_type_test.js.map