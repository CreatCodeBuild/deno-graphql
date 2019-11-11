import graphql from './graphql.js/index.js';

var schema = graphql.buildSchema(`
  type Query {
    hello: String
  }
`);

var root = { 
  hello: () => 'Hello world!'
};

graphql.graphql(schema, '{ hello }', root).then((response) => {
  console.log(response);
});
