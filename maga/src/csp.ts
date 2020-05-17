import { EventEmitter } from "events";

export class Channel<T> {
    private closed: boolean = false;
    private popActions: any[] = [];
    putActions: Array<{resolver: Function, ele: T}> = [];
    dataBuffer: T[] = [];
    mutex = Semaphore(1);
    popLock = Semaphore(1);
    closeEvent = new EventEmitter();


    put(ele: T): Promise<void> {
        if (this.closed) {
            throw new Error('can not put to a closed channel');
        }

        // if no pop action awaiting
        return this.mutex.lock()
            .then(() => {
                console.log('putter', this.putActions, this.popActions);
                if (this.popActions.length === 0) {
                    if (this.putActions.length >= 1) {
                        throw new Error('put: all putters asleep');
                    }
                    return new Promise((resolve) => {
                        console.log('pending put');
                        this.putActions.push({resolver: resolve, ele});
                    })
                } else {
                    return new Promise((resolve) => {
                        console.log('on Pop');
                        let onPop = this.popActions.shift();
                        onPop(ele);
                        resolve();
                    });
                }
            })
            .then(() => {
                console.log('put done', ele);
                return this.mutex.unlock();
            })
    }

    async pop(): Promise<T | undefined> {
        // console.log('popper');
        // if (this.closed) {
        //     console.log('popper: channel closed 1');
        //     // return new Promise((resolve) => {
        //     //     console.log('popper: channel closed 2');
        //     //     resolve(undefined)
        //     // });
        //     return undefined;
        // }

        // console.log('poppers', this.putActions, this.popActions);
        // if (this.putActions.length === 0) {
        //     return new Promise((resolve, reject) => {
        //         if (this.popActions.length >= 1) {
        //             throw new Error('pop: all poppers asleep');
        //         }
        //         console.log('pending pop');
        //         this.closeEvent.once('', () => {
        //             // console.log('pending pop');
        //             resolve("xxx");
        //         })
        //         this.popActions.push(resolve);
        //     })
        // } else {
        //     return new Promise((resolve) => {
        //         let [onPut, ele] = this.putActions.shift();
        //         console.log('onPut');
        //         onPut();
        //         resolve(ele);
        //     });
        // }
        let next = this.next();
        if(next instanceof Promise) {
            return (await next).value;
        }
        return next.value;
    }

    next(): Promise<{value: T, done: false} | {value: undefined, done: true}> | {value: undefined, done: true} {
        console.log('popper');
        if (this.closed) {
            return {value: undefined, done: true};
        }

        console.log('poppers', this.putActions, this.popActions);
        if (this.putActions.length === 0) {
            return new Promise((resolve, reject) => {
                if (this.popActions.length >= 1) {
                    throw new Error('pop: all poppers asleep');
                }
                this.closeEvent.once('', () => {
                    // console.log('pending pop');
                    resolve({value: undefined, done: true});
                })
                this.popActions.push(resolve);
            })
        } else {
            return new Promise((resolve) => {
                let putAction = this.putActions.shift();
                if(putAction === undefined) {
                    throw new Error('unreachable');
                }
                let {resolver, ele} = putAction;
                console.log('onPut');
                resolver();
                resolve({value: ele, done: false});
            });
        }
    }

    // put to a closed channel throws an error
    // pop from a closed channel returns undefined
    // close a closed channel throws an error
    async close() {
        if (this.closed) {
            throw Error('can not close a channel twice');
        }
        console.log('close: closing');
        // this.put(undefined);
        console.log('close: event');
        this.closeEvent.emit('');
        this.closed = true;
        console.log('close: closed');
    }

    async *[Symbol.asyncIterator]() {
        while (!this.closed) {
            // console.log('iter 1');
            // let result = this.pop();
            // if (result instanceof Promise) {
            //     console.log('iter 2-2');
            //     let r = await result;
            //     console.log('iter 2-2', r);
            //     yield r;
            // } else {
            //     console.log('iter 2', result);
            //     return result;
            // }
            let next = await this.next();
            if(next.done) {
                return next.value
            }
            yield next.value;
        }
        return undefined;
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
// https://stackoverflow.com/questions/37021194/how-are-golang-select-statements-implemented
export async function select<T>(channels: [Channel<T>, onSelect<T>][]): Promise<any> {
    let promises = channels.map(([c, func]) => {
        return new Promise(async (resolve) => {
            // @ts-ignore
            resolve(await func(await c.pop()));
        })
    })
    let ret = await Promise.race(promises);
    return ret;
}

export function Semaphore(size: number) {
    let pending = 0;
    let unlocker = new EventEmitter();

    function onEnterLock(resolve) {
        if (pending < size) {
            pending++;
            resolve();
        } else {
            listen(resolve);
        }
    }

    function listen(resolve) {
        unlocker.once('', () => {
            onEnterLock(resolve);
        })
    }

    function lock() {
        return new Promise((resolve) => {
            onEnterLock(resolve);
        })
    }

    async function unlock() {
        console.log('unlock');
        pending--;
        unlocker.emit('')
    }

    type AsyncFunction = () => Promise<any>;
    return {
        async run(f: AsyncFunction) {
            await lock();
            console.log('after lock');
            let r = await f();
            console.log('pre unlock');
            await unlock();
            return r;
        },
        lock,
        unlock
    }
}
