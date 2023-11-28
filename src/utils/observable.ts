export interface Observer<T = unknown> {
    (value: Readonly<T>): void;
}

export interface Observable<T = unknown> {
    subscribe (observer: Observer<T>): void;
    unsubscribe (observer: Observer<T>): void;
}

export class ObserverManager<T = unknown> {

    protected __observers = new Set<Observer<T>>();

    subscribe (observer: Observer<T>): void {

        this.__observers.add(observer);
    }

    unsubscribe (observer: Observer<T>): void {

        this.__observers.delete(observer);
    }

    unsubscribeAll (): void {

        this.__observers.clear();
    }

    notify (value: T): void {

        try {

            Object.freeze(value);

        } catch (error) { /* noop */ }

        this.__observers.forEach(observer => observer(value));
    }
}
