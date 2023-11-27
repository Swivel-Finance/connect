import type { Connection } from '../../interfaces.js';

export interface MockConnectionOptions {
    /**
     * The mock account hash
     *
     * @remarks
     * Used to display the account.
     */
    address: string;
    /**
     * The mock account ens
     *
     * @remarks
     * Used to display the ens name.
     */
    ensAddress?: string;
    /**
     * The network's chain id
     *
     * @remarks
     * e.g.:
     * - `1` for mainnet
     * - `5` for goerli
     */
    chainId: number;
    /**
     * The network name
     *
     * @remarks
     * e.g. 'rinkeby'
     */
    networkName: string;
    /**
     * The mock account's ETH balance
     */
    ethBalance: string;
}

export const DEFAULT_CONNECTION_OPTIONS: MockConnectionOptions = {
    address: '0x1111111111111111111111111111111111111111',
    ensAddress: 'user.eth',
    chainId: 1,
    networkName: 'mainnet',
    ethBalance: '0',
};

export interface MockConnection extends Connection { }
