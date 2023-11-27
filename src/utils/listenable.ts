export interface Listener {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]): any;
}

export interface ListenableEvents {
    [type: string]: Listener;
}

export interface Listenable<T extends ListenableEvents = Record<string, never>> {
    listen<K extends keyof T> (type: K, listener: T[K]): void;
    unlisten<K extends keyof T> (type: K, listener: T[K]): void;
}

export class ListenerManager<T extends ListenableEvents = Record<string, never>> {

    protected listeners = new Map<keyof T, Set<T[keyof T]>>();

    listen<K extends keyof T> (type: K, listener: T[K]) {

        if (!this.listeners.has(type)) {

            this.listeners.set(type, new Set());
        }

        this.listeners.get(type)!.add(listener);
    }

    unlisten<K extends keyof T> (type: K, listener: T[K]) {

        this.listeners.get(type)?.delete(listener);
    }

    unlistenAll (): void {

        this.listeners.forEach(type => type.clear());

        this.listeners.clear();
    }

    dispatch<K extends keyof T> (type: K, ...args: Parameters<T[K]>) {

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        this.listeners.get(type)?.forEach(listener => listener(...args));
    }
}
