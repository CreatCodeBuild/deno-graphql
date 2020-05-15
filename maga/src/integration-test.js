import { Maga, MakeSchema, type, List, Field } from "./maga";
import { GraphQLID, GraphQLString } from "graphql";

let Todo = type(class Todo {
    id = Field(GraphQLID)
    title = Field(GraphQLString)
});

let maga = new Maga({
    schema: {
        query: type(
            class Query {
                todos = Field(
                    List(Todo.Nullable()).Nullable(),
                    (args, ctx, info) => {
                        return {
                            id: 1,
                            title: "example todo"
                        }
                    }
                )

            }
        )
    }
});

maga({
    document: "query { todos { id title } }"
});
