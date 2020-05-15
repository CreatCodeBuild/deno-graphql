export class Channel<T> {
    private closed: boolean = false;
    popActions = [];
    putActions = [];

    put(ele: T) {
        if (this.closed) {
            throw new Error('can not put to a closed channel');
        }
        // if no pop action awaiting
        if (this.popActions.length === 0) {
            if (this.putActions.length >= 1) {
                throw new Error('all promise asleep');
            }
            return new Promise((resolve) => {
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
        if (this.closed) {
            return undefined;
        }
        if (this.putActions.length === 0) {
            if (this.popActions.length >= 1) {
                throw new Error('pop all promise asleep');
            }
            return new Promise((resolve) => {
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
