import { chan, select } from './csp'
import { deepStrictEqual, equal } from 'assert';


describe("Channel", async () => {

    it("can read in order", async () => {
        let c = chan<number>();
        let task1 = async () => {
            let i = 0;
            while (1) {
                await c.put(++i);
                await c.put(++i);
            }
        }
        let task2 = async () => {
            let data: (number | undefined)[] = [];
            let i = 0;
            while (i++ < 10) {
                let x = await c.pop();
                data.push(x);
            }
            return data
        }
        let t1 = task1();
        let t2 = task2();
        deepStrictEqual(await t2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })

    it("supports iteration protocol", async () => {
        let c = chan<number>();
        let task1 = async () => {
            let i = 0;
            while (1) {
                await c.put(++i);
                await c.put(++i);
            }
        }
        let task2 = async () => {
            let data: (number | undefined)[] = [];
            let i = 0;
            for await (let x of c) {
                i++
                data.push(x);
                if (i === 10) {
                    break
                }
            }
            deepStrictEqual(data, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        }
        let t1 = task1();
        let t2 = task2();
        await t2;
    })

    it("close always returns undefined", async () => {
        let c = chan<number>();
        let task1 = async () => {
            await c.close();
        }
        let task2 = async () => {
            let data: (number | undefined)[] = [];
            let x = await c.pop();
            data.push(x);
            x = await c.pop();
            data.push(x);
            x = await c.pop();
            data.push(x);
            return data;
        }
        let t2 = task2();
        await task1();
        deepStrictEqual(await t2, [undefined, undefined, undefined])
    })

    it("close works with put", async () => {
        let c = chan<number>();
        let task1 = async () => {
            await c.put(1);
            await c.close();
        }
        let task2 = async () => {
            let data: (number | undefined)[] = [];
            let x = await c.pop();
            data.push(x);
            x = await c.pop();
            data.push(x);
            return data;
        }
        let t1 = task1();
        let t2 = task2();
        await t1;
        deepStrictEqual(await t2, [1, undefined])
    })

    it("close works with iterator", async () => {
        let c = chan<number>();
        let t1 = async () => {
            await c.put(1);
            await c.put(2);
            await c.close();
        }
        t1();
        let task2 = async () => {
            let data: (number | undefined)[] = [];
            for await (let x of c) {
                data.push(x);
            }
            return data;
        }
        let t2 = task2();
        await t1;
        deepStrictEqual(await t2, [1, 2])
    })

    it("can have concurrent pending put operations", async () => {
        let c = chan<number>();
        let task1 = async () => {
            let p1 = c.put(1);
            let p2 = c.put(2);
            await p1;
            await p2;
            c.close();
        }
        let task2 = async () => {
            let data: (number | undefined)[] = [];
            for await (let x of c) {
                data.push(x);
            }
            return data;
        }
        let t1 = task1();
        let t2 = task2();
        await t1;
        let r = await t2;
        deepStrictEqual(r, [1, 2])
    })

    it("can have concurrent pending pop operations", async () => {
        let c = chan<number>();
        let task1 = async () => {
            let p1 = c.put(1);
            let p2 = c.put(2);
            await p1;
            await p2;
            c.close();
        }
        let task2 = async () => {
            let data: (Promise<number | undefined> | undefined)[] = [];
            for (let i = 0; i < 2; i++) {
                data.push(c.pop())
            }
            let ds: any[] = [];
            for (let d of data) {
                ds.push(await d)
            }
            return ds
        }
        let t2 = task2();
        let t1 = task1();
        await t1;
        let r = await t2;
        deepStrictEqual(r, [1, 2])
    })

});

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

describe('select', async () => {
    it("works", async () => {
        let sec1 = chan<string>();
        sec1.put('put after unblock');
        let x = await select([
            [sec1, async ele => ele],
        ])
        equal('put after unblock', x)
    })
    it("works 2", async () => {
        let unblock = chan<null>();
        unblock.close()
        let sec1 = chan<string>();
        setTimeout(async () => {
            sec1.put('sec1');
        }, 1000);
        let x = await select([
            [sec1, async function (ele) { return ele }],
            [unblock, async function (ele) { return ele }],
        ])
        equal(undefined, x)
    })
    it("can select from a channel that will be closed later", async () => {
        let unblock = chan<null>();
        setTimeout(async () => {
            unblock.close()
        }, 1000);
        let x = await select([
            [unblock, async function (ele) { return ele }],
        ])
        equal(undefined, x)
    })
    it("can select from a channel that will be put later", async () => {
        let unblock = chan<string>();
        setTimeout(async () => {
            unblock.put('put 1 sec later')
        }, 1000);
        let x = await select([
            [unblock, async function (ele) { return ele }],
        ])
        equal('put 1 sec later', x)
    })

    it("can pop from unselected channels", async () => {
        let unblock = chan<null>();
        unblock.close()
        let sec1 = chan<string>();
        let t1 = async () => {
            await delay(1000)
            await sec1.put('sec1');
        }
        t1();
        equal('unblock', await select([
            [unblock, async function () {
                return 'unblock'
            }],
            [sec1, async function () {
                return true
            }]
        ]))
        equal('sec1', await sec1.pop())
    })

    it("returns in order", async () => {
        let unblock = chan<null>();
        unblock.put(null)
        let sec1 = chan<string>();
        sec1.put('put after unblock');
        let x = await select([
            [sec1, async ele => ele],
            // [unblock, async () => 'unblock' ]
        ])
        equal('put after unblock', x)
    })

    xit("favors channels with values ready to be received over closed channels", async () => {
        // Currently does not support, but
        // Is this even a good design decision?
        let unblock = chan<null>();
        unblock.close()
        let sec1 = chan<null>();
        sec1.put(null);
        let x = await select([
            [sec1, async function () { return 'sec1' }],
            [unblock, async function () { return 'unblock' }],
        ])
        equal('sec1', x)
    })

    it('has default case', async () => {
        let unblock = chan<null>();
        equal('default', await select(
            [
                [unblock, async function () { return 'unblock' }],
            ],
            async function () {
                return 'default'
            }
        ))
    })
    it("won't trigger default case if the normal case is ready", async () => {
        let unblock = chan<null>();
        unblock.close()
        equal(await select(
            [
                [unblock, async function () { return 'unblock' }],
            ],
            async function () {
                return 'default'
            }
        ), 'unblock')
    })
    it("won't trigger default case if the normal case is ready 2", async () => {
        let unblock = chan<string>();
        unblock.put('something')
        equal(await select(
            [
                [unblock, async function (ele) { return ele }],
            ],
            async function () {
                return 'default'
            }
        ), 'something')
    })
});

// describe('Semaphore', async () => {
//     it('works', async () => {
//         let s = Semaphore(2);
//         let tasks: Promise<any>[] = [];
//         let time = new Date();
//         for (let i = 0; i < 10; i++) {
//             let t = s.run(async () => {
//                 await delay(100)
//             })
//             tasks.push(t);
//         }
//         for (let t of tasks) {
//             await t;
//         }
//         // @ts-ignore
//         let timeSpend = new Date() - time;
//         // 10 tasks, 2 concurrency, 100 ms each
//         // 500 ms total
//         equal(520 > timeSpend && timeSpend >= 500, true)
//     })
// });

// describe('event stream', async () => {


//     function EventStream() {
//         let q: any[] = [];
//         return {
//             push: async function* f() {
//                 while (true) {
//                     console.log('push pre yield');
//                     let x = yield;
//                     console.log('push', x);
//                     q.push(x);
//                 }
//             },
//             pull: async function* f() {
//                 while (true) {
//                     yield q.shift();
//                 }
//             }
//         }
//     }

//     let { push, pull } = EventStream();
//     let pusher = push()
//     let data: any[] = [];
//     let puller = pull()
//     data.push((await puller.next()).value);
//     data.push((await puller.next()).value);
//     data.push((await puller.next()).value);
//     data.push((await puller.next()).value);
//     await pusher.next(0);
//     await pusher.next(1);
//     await pusher.next(2);
//     await pusher.next(3);
//     await pusher.next(4);
//     deepStrictEqual(data, [1, 2, 3, 4])
// })

