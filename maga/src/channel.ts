export class Channel<T> {

    popActions = [];
    putActions = [];

    put(ele: T) {
        // if no pop action awaiting
        if (this.popActions.length === 0) {
            return new Promise((resolve) => {
                console.log('put promise');
                if (this.putActions.length >= 1) {
                    throw new Error('all promise asleep');
                }
                this.putActions.push([resolve, ele]);
            })
        } else {
            let onPop = this.popActions.shift();
            onPop(ele);
            return new Promise((resolve) => {
                resolve()
            });
        }
    }

    pop(): Promise<T> {
        if (this.putActions.length === 0) {
            return new Promise((resolve) => {
                console.log('pop promise');
                if (this.popActions.length >= 1) {
                    throw new Error('pop all promise asleep');
                }
                this.popActions.push(resolve);
            })
        } else {
            let [onPut, ele] = this.putActions.shift();
            onPut();
            return new Promise((resolve) => {
                resolve(ele)
            });
            // return ele;
        }
    }
}

export function chan<T>() {
    return new Channel<T>();
}
