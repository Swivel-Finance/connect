/**
 * Interface for an EIP-1193 JavaScript Ethereum Provider
 *
 * @remarks
 * https://eips.ethereum.org/EIPS/eip-1193
 * We use a our own spec-compliant interface here, as ethers' types for the ExternalProvider
 * or Web3Provider don't correctly implement the {@link RequestArguments} interface.
 */
export interface EIP1193Provider {
    request (args: RequestArguments): Promise<unknown>;
    on<K extends keyof ProviderEvents> (type: K, listener: ProviderEvents[K]): void;
    removeListener<K extends keyof ProviderEvents> (type: K, listener: ProviderEvents[K]): void;
}

export interface RequestArguments {
    readonly method: string;
    readonly params?: unknown[] | object;
}

export interface ProviderRpcError extends Error {
    code: number;
    data?: unknown;
}

export interface ProviderMessage {
    readonly type: string;
    readonly data: unknown;
}

export interface ProviderConnectInfo {
    readonly chainId: string;
}

export const PROVIDER_EVENTS = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    CHAIN_CHANGED: 'chainChanged',
    ACCOUNTS_CHANGED: 'accountsChanged',
    MESSAGE: 'message',
} as const;

export type ProviderEvents = {
    [PROVIDER_EVENTS.CONNECT]: (info: ProviderConnectInfo) => void;
    [PROVIDER_EVENTS.DISCONNECT]: (error: ProviderRpcError) => void;
    [PROVIDER_EVENTS.CHAIN_CHANGED]: (chainId: string) => void;
    [PROVIDER_EVENTS.ACCOUNTS_CHANGED]: (accounts: string[]) => void;
    [PROVIDER_EVENTS.MESSAGE]: (message: ProviderMessage) => void;
};
