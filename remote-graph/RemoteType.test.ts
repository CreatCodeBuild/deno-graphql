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
import { CompileRemoteSelectionSet, CompileRemoteQuery, RemoteType } from "./RemoteType";
import { HTTP } from "./Transport";

const fetch = require("node-fetch");
const fs = require("fs").promises;

const assert = require("assert");

const log = console.log;
describe("CompileRemoteSelectionSet", async () => {
	let source = `
		type Query {
			books(
				arg1: Int,
				arg2: CompositeInput,
				arg3: Enum
			): [Book]
		}

		enum Enum {
			X
			Y
		}

		type Book {
			title: String
			author: Author
		}

		type Author {
			name: String
		}

		input CompositeInput {
			title: String
			author: String
			time: Date
		}

		input Date {
			year: Int
			month: Int
		}
	`;

	let schema = buildSchema(source);

	it("test 1, basic", async () => {
		let root = {
			books: (parent, args, info) => {
				assert.strictEqual(CompileRemoteSelectionSet(info).join(''), `{title,}`);
			}
		};
		let res = await graphql(schema, `{ books { title } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	it("test 2, alias", async () => {
		let root = {
			books: (parent, args, info) => {
				assert.strictEqual(CompileRemoteSelectionSet(info).join(''), `{title,}`);
			}
		};
		let res = await graphql(schema, `{ books { x:title } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	it("test 3, basic & alias", async () => {
		let root = {
			books: (parent, args, info) => {
				assert.strictEqual(CompileRemoteSelectionSet(info).join(''), `{title,title,}`);
			}
		};
		let res = await graphql(schema, `{ books { x:title title } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	it("test 4, 2 layers", async () => {
		let root = {
			books: (parent, args, info: GraphQLResolveInfo) => {
				assert.strictEqual(CompileRemoteSelectionSet(info).join(''), `{author{name,},}`);
			}
		};
		let res = await graphql(schema, `{ books { author { name } } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	it("test 5, 2 layers & custom separator", async () => {
		let root = {
			books: (parent, args, info: GraphQLResolveInfo) => {
				assert.strictEqual(CompileRemoteSelectionSet(info, ' ').join(''), `{author{name } }`);
			}
		};
		let res = await graphql(schema, `{ books { author { name } } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	it("test 6, 2 layers & custom separator", async () => {
		let root = {
			books: (parent, args, info: GraphQLResolveInfo) => {
				assert.strictEqual(CompileRemoteSelectionSet(info).join(''), `{author{name,},title,}`);
			}
		};
		let res = await graphql(schema, `{ books { author { n:name } t:title } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	it("test 7, arguments", async () => {
		let root = {
			books: (parent, args, info: GraphQLResolveInfo) => {
				assert.strictEqual(CompileRemoteSelectionSet(info).join(''), `{title,}`);
			}
		};
		let res = await graphql(schema, `{ books(arg1: 1) { title } }`, root);
		assert.strictEqual(res.errors, undefined);
	});
	describe('CompileRemoteQuery', () => {
		it('test 8, arguments', async () => {
			let root = {
				books: (parent, args, info: GraphQLResolveInfo) => {
					assert.strictEqual(CompileRemoteQuery(info, 'query', 'books'), `query{books(arg1:1,){title,}}`);
				}
			};
			let res = await graphql(schema, `{ books(arg1: 1) { title } }`, root);
			assert.strictEqual(res.errors, undefined);
		});
		it('test 9, composite arguments', async () => {
			let root = {
				books: (parent, args, info: GraphQLResolveInfo) => {
					assert.strictEqual(
						CompileRemoteQuery(info, 'query', 'books'),
						`query{books(arg1:1,arg2:{author:"x",title:"y",},){title,}}`);
				}
			};
			let res = await graphql(schema, `{ books(arg1: 1, arg2: {author:"x",title:"y"}) { title } }`, root);
			assert.strictEqual(res.errors, undefined);
		});
		it('test 10, layered composite arguments', async () => {
			let root = {
				books: (parent, args, info: GraphQLResolveInfo) => {
					assert.strictEqual(
						CompileRemoteQuery(info, 'query', 'books'),
						`query{books(arg1:1,arg2:{author:"x",title:"y",time:{month:11,year:2019,},},){title,}}`);
				}
			};
			let res = await graphql(
				schema,
				`{ books(arg1: 1, arg2: {author:"x",title:"y",time:{month:11,year:2019}}) { title } }`,
				root
			);
			assert.strictEqual(res.errors, undefined);
		});
		it('test 11, enum argument', async () => {
			let root = {
				books: (parent, args, info: GraphQLResolveInfo) => {
					assert.strictEqual(
						CompileRemoteQuery(info, 'query', 'books'),
						`query{books(arg3:Y,){title,}}`);
				}
			};
			let res = await graphql(
				schema,
				`{ books(arg3: Y) { title } }`,
				root
			);
			assert.strictEqual(res.errors, undefined);
		});
	});
});

describe('Integration Tests', async () => {
	let source = `
		type Query {
			books: [Book]
			booksBy(author: String): [Book]
		}
		type Book {
			title: String
			author: String
		}
	`;

	let schema = buildSchema(source);

	const service1Port = 4000;
	const { server } = require('./integration-tests/service1');
	const serverUp = await server.listen({ port: service1Port });
	it("test 1", async () => {
		let root = {
			books: await RemoteType(HTTP(serverUp.url), `query`, `getAllBooks`)
		};
		let res = await graphql(schema, `{ books { author t:title } }`, root);
		assert.strictEqual(res.errors, undefined);
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
	it("test 2, arguments", async () => {
		let root = {
			booksBy: await RemoteType(HTTP(serverUp.url), `query`, `getBooksBy`)
		};
		let res = await graphql(schema, `{ booksBy(author:"J.K. Rowling") { author title } }`, root);
		assert.strictEqual(res.errors, undefined);
		assert.deepEqual(res.data.booksBy, [
			{
				title: 'Harry Potter and the Chamber of Secrets',
				author: 'J.K. Rowling',
			}
		]);

	});
	it("test 3, composite arguments", async () => {
		let root = {
			booksBy: await RemoteType(HTTP(serverUp.url), `query`, `getBooksBy`)
		};
		let res = await graphql(schema, `{ booksBy(author:"J.K. Rowling") { author title } }`, root);
		assert.strictEqual(res.errors, undefined);
		assert.deepEqual(res.data.booksBy, [
			{
				title: 'Harry Potter and the Chamber of Secrets',
				author: 'J.K. Rowling',
			}
		]);
	});
	after(async () => {
		await server.stop();
	});
});
