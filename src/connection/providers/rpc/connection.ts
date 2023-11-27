import type { Connection } from '../../interfaces.js';

export interface RpcConnectionOptions {
    url: string;
    chainId: number;
    privateKey: string;
}

export const DEFAULT_CONNECTION_OPTIONS: RpcConnectionOptions = {
    url: '',
    chainId: 1,
    privateKey: '',
};

export interface RpcConnection extends Connection {}
