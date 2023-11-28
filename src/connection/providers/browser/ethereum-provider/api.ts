import { utils } from 'ethers';
import { EIP1193Provider, PROVIDER_EVENTS } from './eip-1193.js';

export const getChain = async (provider: EIP1193Provider): Promise<number> => {

    const chain = await provider.request({ method: 'eth_chainId' }) as string;

    return parseInt(chain, 16);
};

/**
 * @remarks
 * https://eips.ethereum.org/EIPS/eip-1102
 */
export const getAccounts = async (provider: EIP1193Provider): Promise<string[]> => {

    const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];

    return accounts;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface SwitchEthereumChainParameter {
    chainId: string;
}

/**
 * @remarks
 * https://eips.ethereum.org/EIPS/eip-3326
 */
export const switchChain = async (provider: EIP1193Provider, chainId: number): Promise<void> => {

    // eslint-disable-next-line no-useless-catch
    try {

        // awaiting a 'wallet_switchEthereumChain' request does not wait for the wallet to actually switch the chain
        // we need to listen for it using the 'chainChanged' event and this helper promise takes care of adding a
        // temporary event listener and cleaning it up
        const chainChanged = new Promise<void>((resolve, reject) => {

            const handler = (changedChainId: string) => {

                provider.removeListener(PROVIDER_EVENTS.CHAIN_CHANGED, handler);

                (parseInt(changedChainId, 16) === chainId)
                    ? resolve()
                    : reject();
            };

            provider.on(PROVIDER_EVENTS.CHAIN_CHANGED, handler);
        });

        // request the chain switch
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: utils.hexValue(chainId) }],
        });

        // wait for the chain to change
        await chainChanged;

    } catch (error) {

        // TODO: if error code is 4902, try adding the chain using `wallet_addEthereumChain`...

        throw error;
    }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AddEthereumChainParameter {
    chainId: string;
    blockExplorerUrls?: string[];
    chainName?: string;
    iconUrls?: string[];
    nativeCurrency?: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls?: string[];
}

/**
 * @remarks
 * https://eips.ethereum.org/EIPS/eip-3085
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const addChain = async () => {

    throw new Error('Adding custom chains is not yet implemented.');
};

export interface WatchAssetParameters {
    /**
     * The asset's interface, e.g. 'ERC1046', 'ERC20', 'ERC721' or 'ERC1155'.
     */
    type: 'ERC1046' | 'ERC20' | 'ERC721' | 'ERC1155';
    options: WatchAssetOptions;
}

interface ERC1046WatchAssetOptions {
    /**
     * The address of the token contract.
     */
    address: string;
    /**
     * The chain ID of the asset. If empty, defaults to the current chain ID.
     */
    chainId?: number;
}

interface ERC20WatchAssetOptions extends ERC1046WatchAssetOptions {
    /**
     * The address of the token contract.
     */
    address: string;
    /**
     * The chain ID of the asset. If empty, defaults to the current chain ID.
     */
    chainId?: number;
}

interface MetaMaskWatchAssetOptions extends ERC20WatchAssetOptions {
    /**
     * A ticker symbol or shorthand, up to 11 characters (optional for ERC-20 tokens).
     */
    symbol?: string;
    /**
     * The number of token decimals (optional for ERC-20 tokens).
     */
    decimals?: number;
    /**
     * A string URL of the token logo (optional for ERC-20 tokens).
     */
    image?: string;
    /**
     * The unique identifier of the NFT (required for ERC-721 and ERC-1155 tokens).
     */
    tokenId?: string;
}

export type WatchAssetOptions = ERC1046WatchAssetOptions | ERC20WatchAssetOptions | MetaMaskWatchAssetOptions;

/**
 * @remarks
 * https://eips.ethereum.org/EIPS/eip-747
 */
export const watchAsset = async (provider: EIP1193Provider, asset: WatchAssetParameters) => {

    await provider.request({
        method: 'wallet_watchAsset',
        params: asset,
    });
};
