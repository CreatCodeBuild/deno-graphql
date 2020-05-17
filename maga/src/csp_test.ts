import { chan, select, Semaphore } from './csp'
import { deepStrictEqual, equal } from 'assert';


describe("Channel", async () => {

    it("can read in order", async () => {
        let c = chan<number>();
        let task1 = async () => {
            let i = 0;
            while (1) {
                console.log('put loop', i);
                await c.put(++i);
                console.log('put loop', i);
                await c.put(++i);
            }
        }
        let task2 = async () => {
            let data: (number|undefined)[] = [];
            let i = 0;
            while (i++ < 10) {
                console.log('pre pop', data);
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
            let data: (number|undefined)[] = [];
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

    it("closes always return undefined", async () => {
        let c = chan<number>();
        let task1 = async () => {
            // await c.put(1);
            // console.log('first put done');
            // await c.put(2);
            await c.close();
            console.log('closed');
        }
        let task2 = async () => {
            let data: (number|undefined)[] = [];
            let x = await c.pop();
            data.push(x);
            x = await c.pop();
            data.push(x);
            x = await c.pop();
            console.log('should pop undefined');
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
            console.log('first put done');
            // await c.put(2);
            await c.close();
            console.log('closed');
        }
        let task2 = async () => {
            let data: (number|undefined)[] = [];
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
        await c.close();
        let task2 = async () => {
            let data: (number|undefined)[] = [];
            for await (let x of c) {
                data.push(x);
            }
            return data;
        }

        let t2 = task2();
        deepStrictEqual(await t2, [])
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
            let data: (number|undefined)[] = [];
            for await (let x of c) {
                data.push(x);
            }
            return data;
        }
        let t1 = task1();
        let t2 = task2();
        await t1;
        let r = await t2;
        console.log(r);
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
        let unblock = chan<null>();
        unblock.close()
        let sec1 = chan<null>();
        setTimeout(async () => {
            sec1.put(null);
        }, 0);
        let x = await select([
            [sec1, async function () { return true }],
            [unblock, async function () { return false }]
        ])
        equal(false, x)
    })
    it("returns in order", async () => {
        let unblock = chan<null>();
        unblock.close()
        let sec1 = chan<null>();
        sec1.put(null);
        let x = await select([
            [sec1, async function () { return true }],
            [unblock, async function () { return false }]
        ])
        equal(true, x)
    })
    xit("can pop from unselected channels", async () => {
        let unblock = chan<null>();
        unblock.close()
        let sec1 = chan<null>();
        setTimeout(async () => {
            sec1.put(null);
        }, 100);
        let x = await select([
            [unblock, async function () {
                return false
            }],
            [sec1, async function () {
                await delay(100);
                console.log('123');
                return true
            }]
        ])
        // sec1.put(null);
        equal(false, x)
        // equal(null, await sec1.pop())
    })

    xit("favors channels with values ready to be received over closed channels", async () => {
        // Currently does not support, but
        // Is this even a good design decision?
        let unblock = chan<null>();
        unblock.close()
        let sec1 = chan<null>();
        sec1.put(null);
        let x = await select([
            [unblock, async function () { return false }],
            [sec1, async function () { return true }],
        ])
        equal(true, x)
    })
});

describe('Semaphore', async () => {
    it('works', async () => {
        let s = Semaphore(2);
        let tasks: Promise<any>[] = [];
        let time = new Date();
        for (let i = 0; i < 10; i++) {
            let t = s.run(async () => {
                await delay(100)
            })
            tasks.push(t);
        }
        for (let t of tasks) {
            await t;
        }
        // @ts-ignore
        let timeSpend = new Date() - time;
        // 10 tasks, 2 concurrency, 100 ms each
        // 500 ms total
        equal(520 > timeSpend && timeSpend >= 500, true)
    })
});
