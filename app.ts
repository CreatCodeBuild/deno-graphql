import graphql from 'https://raw.githubusercontent.com/CreatCodeBuild/deno-graphql/master/graphql.js';

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
