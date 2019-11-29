const { ApolloServer, gql } = require('apollo-server');

const typeDefs = gql`
  type Book {
    title: String
    author: String
  }
  type Query {
    getAllBooks: [Book!]!
	getBooksBy(author: String!): [Book!]!
  }
`;

const books = [
	{
		title: 'Harry Potter and the Chamber of Secrets',
		author: 'J.K. Rowling',
	},
	{
		title: 'Jurassic Park',
		author: 'Michael Crichton',
	},
];

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
	Query: {
		getAllBooks: () => {
			return books
		},
		getBooksBy: (_0, args, _1) => {
			return books.filter((book) => {
				return book.author === args.author;
			})
		}
	},
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
export const server = new ApolloServer({ typeDefs, resolvers });
