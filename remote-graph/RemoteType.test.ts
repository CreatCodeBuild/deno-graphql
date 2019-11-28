import {
	GraphQLResolveInfo,
	FieldNode,
	parse,
	DocumentNode,
	graphql,
	buildSchema,
	IntrospectionQuery,
	isType
} from "graphql";
import { CompileRemoteSelectionSet, RemoteType } from "./RemoteType";

const fetch = require("node-fetch");
const fs = require("fs").promises;

const assert = require("assert");

const log = console.log;
describe("CompileRemoteSelectionSet", async () => {
	let source = `
		type Query {
			books: [Book]
		}

		type Book {
			title: String
			author: Author
		}

		type Author {
			name: String
		}
	`;

	let schema = buildSchema(source);

	it("test 1, basic", async () => {
		let root = {
			books: (parent, args, info) => {
				assert.strictEqual(CompileRemoteSelectionSet(info), `{title,}`);
			}
		};
		let res = await graphql(schema, `{ books { title } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	it("test 2, alias", async () => {
		let root = {
			books: (parent, args, info) => {
				assert.strictEqual(CompileRemoteSelectionSet(info), `{title,}`);
			}
		};
		let res = await graphql(schema, `{ books { x:title } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	it("test 3, basic & alias", async () => {
		let root = {
			books: (parent, args, info) => {
				assert.strictEqual(CompileRemoteSelectionSet(info), `{title,title,}`);
			}
		};
		let res = await graphql(schema, `{ books { x:title title } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	it("test 4, 2 layers", async () => {
		let root = {
			books: (parent, args, info: GraphQLResolveInfo) => {
				if(info.fieldNodes[0])
				assert.strictEqual(CompileRemoteSelectionSet(info), `{author{name,},}`);
			}
		};
		let res = await graphql(schema, `{ books { author { name } } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	it("test 5, 2 layers & custom separator", async () => {
		let root = {
			books: (parent, args, info: GraphQLResolveInfo) => {
				if(info.fieldNodes[0])
				assert.strictEqual(CompileRemoteSelectionSet(info, ' '), `{author{name } }`);
			}
		};
		let res = await graphql(schema, `{ books { author { name } } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	it("test 6, 2 layers & custom separator", async () => {
		let root = {
			books: (parent, args, info: GraphQLResolveInfo) => {
				if(info.fieldNodes[0])
				assert.strictEqual(CompileRemoteSelectionSet(info), `{author{name,},title,}`);
			}
		};
		let res = await graphql(schema, `{ books { author { n:name } t:title } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
});

describe('Integration Tests', async () => {
	let source = `
		type Query {
			books: [Book]
		}
		type Book {
			title: String
			author: String
		}
	`;

	let schema = buildSchema(source);

	const service1Port = 4000;
	const { server } = require('./integration-tests/service1');
	const serverUp = await server.listen({port: service1Port});
	it("tset 1", async () => {
		let root = {
			books: RemoteType(serverUp.url, `query`, `getAllBooks`)
		};
		let res = await graphql(schema, `{ books { author t:title } }`, root);
		assert.strictEqual(res.errors, undefined);
		log(res.data.books);
		assert.deepEqual(res.data.books, [
			{
				t: 'Harry Potter and the Chamber of Secrets',
				author: 'J.K. Rowling',
			},
			{
				t: 'Jurassic Park',
				author: 'Michael Crichton',
			},
		]);
		
	});
	after(async () => {  
		await server.stop();
	});
});
