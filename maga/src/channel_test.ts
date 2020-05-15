import { chan } from './channel';
import { deepStrictEqual } from 'assert';


describe("", async () => {

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
