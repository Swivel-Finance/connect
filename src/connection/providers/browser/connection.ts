import type { Account, Connection } from '../../interfaces.js';
import { EIP6963ProviderDetail, EthereumProviderIdentifier } from './ethereum-provider/index.js';

export interface BrowserConnectionOptions {
    /**
     * The chain ID of the network to connect to.
     */
    chainId: number;
    /**
     * The identifier of the wallet to connect to.
     *
     * @remarks
     * This is used to select a specific wallet when multiple wallets are available.
     */
    walletIdentifier?: EthereumProviderIdentifier;
}

export const DEFAULT_CONNECTION_OPTIONS: BrowserConnectionOptions = {
    chainId: 1,
};

export interface BrowserConnection extends Connection {
    accounts: Account[];
    wallet: EIP6963ProviderDetail;
}

export const isBrowserConnection = (connection?: Connection): connection is BrowserConnection => {

    return (connection as BrowserConnection | undefined)?.wallet !== undefined;
};
