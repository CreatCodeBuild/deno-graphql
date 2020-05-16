import * as Promise from 'bluebird';
Promise.config({
    cancellation: true
})

export class Channel<T> {
    private closed: boolean = false;
    private popActions = [];
    putActions = [];

    put(ele: T) {
        if (this.closed) {
            throw new Error('can not put to a closed channel');
        }
        // if no pop action awaiting
        if (this.popActions.length === 0) {
            if (this.putActions.length >= 1) {
                throw new Error('put: all poppers asleep');
            }
            return new Promise((resolve) => {
                this.putActions.push([resolve, ele]);
            })
        } else {
            return new Promise((resolve) => {
                let onPop = this.popActions.shift();
                onPop(ele);
                resolve()
            });
        }
    }

    pop(): Promise<T> {
        if (this.closed) {
            return new Promise((resolve) => resolve(undefined));
        }
        console.log(this.putActions, this.popActions);
        if (this.putActions.length === 0) {
            if (this.popActions.length >= 1) {
                throw new Error('pop: all putters asleep');
            }
            return new Promise((resolve) => {
                this.popActions.push(resolve);
            })
        } else {
            return new Promise((resolve) => {
                let [onPut, ele] = this.putActions.shift();
                onPut();
                resolve(ele)
            });
            // return ele;
        }
    }

    // put to a closed channel throws an error
    // pop from a closed channel returns undefined
    // close a closed channel throws an error
    close() {
        if (this.closed) {
            throw Error('can not close a channel twice');
        }
        this.closed = true;
    }

    async*[Symbol.asyncIterator]() {
        while (!this.closed) {
            yield await this.pop();
        }
    }
}

export function chan<T>() {
    return new Channel<T>();
}

interface onSelect<T> {
    (ele: T): Promise<any>
}

// Warning: The current implementation can't cancel receive/pop operations
// on other channels because there isn't an elegant way of cancelling promise
// in JS yet.
//
// From a design perspective, a promise or a future should never be cancelled.
// It should be immutable once born since by definition, it's an observation of a guarantee.
// But, async operations of a coroutine should be cancellable.
//
// I consider it a bad design to use the async function as a syntax sugar for promises
// in JavaScript because we now don't have a clean syntax to express coroutines in JS.
// Generator functions can be used as coroutines but it involves more syntax.
// Anyway, this is what we get now.
//
export async function select<T>(channels: [Channel<T>, onSelect<T>][]): Promise<any> {
    let promises = channels.map(([c, func]) => {
        return new Promise(async (resolve) => {
            resolve(await func(await c.pop()));
        })
    })
    let ret = await Promise.race(promises);
    for (let p of promises) {
        p.cancel();
        // console.log(p);
    }
    return ret;


    // let t = task(async function() {
    //     await 1
    //     await 2
    //     await 3
    //     return 4
    // })

    // await t.start()

    // await t.cancel()
}

// class Task<F extends Function> {

//     f: F

//     constructor(f) {
//         this.f = f;
//     }

//     async start() {
//         return this.f();
//     }

//     async cancel() {

//     }
// }

// function task(f) {
//     return new Task(f);
// }
