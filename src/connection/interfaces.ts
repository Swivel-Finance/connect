import type { Provider } from '@ethersproject/abstract-provider';
import type { Signer } from '@ethersproject/abstract-signer';
import { Listenable } from '../utils/listenable.js';
import type { BrowserConnectionOptions } from './providers/browser/connection.js';
import { PROVIDER_EVENTS } from './providers/browser/ethereum-provider/eip-1193.js';
import type { MockConnectionOptions } from './providers/mock/connection.js';
import type { RpcConnectionOptions } from './providers/rpc/connection.js';

export interface Network {
    name: string;
    chainId: number;
    ensAddress?: string;
}

export interface Account {
    address: string;
    ensAddress?: string;
}

export interface Connection {
    network: Network;
    account: Account;
    provider: Provider;
    signer: Signer;
}

export type ConnectionOptions = BrowserConnectionOptions | RpcConnectionOptions | MockConnectionOptions;

export const CONNECTION_EVENTS = {
    ...PROVIDER_EVENTS,
};

export type ConnectionEvents = {
    [CONNECTION_EVENTS.CONNECT]: (connection: Connection) => void;
    [CONNECTION_EVENTS.DISCONNECT]: (error?: Error) => void;
    [CONNECTION_EVENTS.CHAIN_CHANGED]: (chainId: number) => void;
    [CONNECTION_EVENTS.ACCOUNTS_CHANGED]: (accounts: string[]) => void;
};

/**
 * The connection provider interface.
 *
 * @remarks
 * The connection provider is responsible for connecting to the blockchain. This can be done
 * by various means, e.g. using a browser wallet extemsion or a custom RPC provider like
 * Infura or Alchemy (which is useful when running in non-browser environments).
 * The connection provider serves as an abstraction between the wallet service and the actual
 * connection implementation. This allows us to easily switch between different connection
 * implementations.
 */
export interface ConnectionProvider extends Listenable<ConnectionEvents> {
    connection?: Connection;
    connected: boolean;
    connect (options?: Partial<ConnectionOptions>): Promise<Connection>;
    disconnect (error?: unknown): Promise<void> | void;
}
