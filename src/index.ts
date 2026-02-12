import { log, add, fibSequence } from "./lib.js";

log("hello from js!")

console.log('2 + 3 =', await add(2, 3));

console.log(await fibSequence(10));
