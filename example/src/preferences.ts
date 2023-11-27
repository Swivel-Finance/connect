import { EthereumProviderIdentifier } from '@swivel-finance/connect';

export type Preferences = {
    autoConnect: boolean;
    walletIdentifier: EthereumProviderIdentifier;
};

export const preferences = {

    get<K extends keyof Preferences> (key: K): Preferences[K] | undefined {

        const value = window.localStorage.getItem(key);

        return value !== null ? JSON.parse(value) as Preferences[K] : undefined;
    },

    set<K extends keyof Preferences> (key: K, value: Preferences[K]): void {

        window.localStorage.setItem(key, JSON.stringify(value));
    },

    delete<K extends keyof Preferences> (key: K): void {

        window.localStorage.removeItem(key);
    },

    clear (): void {

        window.localStorage.clear();
    },
};
