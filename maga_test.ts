import { assertEquals } from "https://deno.land/std@v0.11/testing/asserts.ts";
import { test } from "https://deno.land/std@v0.11/testing/mod.ts";
import {} from "./maga.ts";

test(function myTestFunction() {

    doc({
        query: {
            x: {
                y: null,
            }
        }
    })

});