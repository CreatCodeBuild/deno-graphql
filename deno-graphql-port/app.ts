import graphql from './dist/graphql.js';

try {
    var schema = graphql.buildSchema(`
    type X {
      hello:: String
    }
  `);
} catch(e) {
    console.error(e.message, e.locations);
    Deno.exit(1);
}


var root = { 
  hello: () => 'Hello world!'
};

let x = await graphql.graphql(schema, `{hello}`, root)
console.log(x)