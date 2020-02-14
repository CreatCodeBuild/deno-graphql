import { Maga, args, or, ret } from './maga';

import { printType } from 'graphql';

class User {
    constructor(
        public id: string,
        public name: string | null
    ) {}
}

class Query {

    constructor() {

    }

    @args({
        id: String,
        name: String
    })
    getUser(args, ctx, info) {

    }

}

const q = new Query();

//@ts-ignore
console.log(printType(q.schema));

// @ts-ignore
// q.x = 2;
// @ts-ignore
// @ts-ignore
// console.log(q);

// class Mutation {
//     @args({
//         id: String,
//         name: or(String, null)
//     })
//     @ret(User)
//     addUser(args, ctx, info) {
//         return true
//     }
// }

// const maga = new Maga({
//     Query,
//     // Mutation
// });

// console.log(maga.getSchema());

// maga.run({
//     query: '{ getUser(id: 1) { name } }'
// });



`
type Query {
    getUser(id: ID): User
}

type User {
    id: ID!
    name: String
}
`