import { chan, select } from './channel';
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
            let data = [];
            let i = 0;
            while (i++ < 10) {
                let x = await c.pop();
                data.push(x);
            }
            deepStrictEqual(data, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        }
        let t1 = task1();
        let t2 = task2();
        await t2;
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
            let data = [];
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

    it("closes", async () => {
        let c = chan<number>();
        let task1 = async () => {
            await c.put(1);
            await c.put(2);
            c.close();
        }
        let task2 = async () => {
            let data = [];
            let i = 0;
            for await (let x of c) {
                i++
                data.push(x);
            }
            deepStrictEqual(data, [1, 2])
        }
        let t1 = task1();
        let t2 = task2();
        await t1;
        await t2;
    })

});

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
