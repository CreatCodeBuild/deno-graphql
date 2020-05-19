# Communicating Sequential Process in All of JavaScript
This is a ES module that supports CSP style of concurrency in Browser, Node and Deno. This module has no external dependencies.

## How to Use
`Channel` has 3 interfaces
```ts
interface Channel<T> {
  async put(T)
  async pop(): T
  close()
}
```
`put` sends an element to the channel. It blocks until the other end is ready to receive/pop the element.

`pop` receives element out from the channel. It blocks until the other end is ready to send/put the element.

`put` and `pop` can be used in 2 different async task/promise chain to coordinate.

`close` clsoes the channel. `put` to a closed channel throws an error and `pop` from a closed channel always return `undefined`.

The implementation is mapped to Go's channel semantics as close as possible until the nature of JS advices otherwise.


## Why?
My motivation of writing it is not merely an intellectual pursue of reinvention the wheel, considering there are already at least 3 implementations of CSP in JavaScript.

I am writing a new kind of GraphQL backend framework that focuses on distributed development (multi-lingua) and real-time communicating (GraphQL Subscription). Why am I writing yet another GraphQL framework? That deserves an article of its own. In order to achieve it, I need a robust concurrent model that can work both in a single process and distributely. After much research, I have chosen CSP over Actor Model because 

1. CSP is easier to implement.
2. CSP works better in a single-process situation.
3. Go has native CSP so that I save energy (I'm only targeting JS and Go at the moment)

None of the CSP implementations in JS meets my requirement so that I have to implement my own. It's faster to write my own than PR to other repos.
