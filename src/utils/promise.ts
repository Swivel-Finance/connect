interface PromiseResolver<T> {
    (value: T | PromiseLike<T>): void;
}

interface PromiseRejector {
    (reason?: unknown): void;
}

export class PromiseController<T> {

    protected _resolve!: PromiseResolver<T>;

    protected _reject!: PromiseRejector;

    readonly promise: Promise<T>;

    constructor () {

        this.promise = new Promise<T>((resolve, reject) => {

            this._resolve = resolve;
            this._reject = reject;
        });
    }

    resolve (value: T | PromiseLike<T>): void {

        this._resolve(value);
    }

    reject (reason?: unknown): void {

        this._reject(reason);
    }
}

export function schedule<T> (callback: () => T): Promise<T> {

    return Promise.resolve().then(callback);
}
