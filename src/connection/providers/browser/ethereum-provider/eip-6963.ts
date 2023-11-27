import { EIP1193Provider } from './eip-1193.js';

/**
 * Get a list of all detected EIP-6963 providers (browser wallets).
 */
export async function getEthereumProviders (): Promise<EIP6963ProviderDetail[]> {

    const providers = await detectProviders();

    return providers;
}

/**
 * Get the EIP-6963 provider (browser wallet) that matches the given identifier.
 *
 * @remarks
 * On page reload, the `uuid`s of the EIP-6963 providers change, meaning we cannot use them to identify wallets
 * over multiple sessions. To alleviate this, we use the `name` and `rdns` properties to provide a 'fuzzy' match
 * for selected wallets.
 * This introduces a problem when multiple wallets are available that have the same `name` and `rdns` properties.
 * (This could happen when a malicious extension tries to imitate another extension.)
 *
 * To work around this issue, we first try to find an exact match (`name`, `rdns`, and `uuid`). If we find one,
 * we use that one. If we don't find an exact match, we try to find a 'fuzzy' match (`name` and `rdns`). If we
 * find exactly one, we use that one. If we find multiple, the user might have a malicious extension installed,
 * so we don't return a match, forcing the UI to ask the user to explicitly select a wallet.
 */
export function getEthereumProvider (providers: EIP6963ProviderDetail[], identifier?: EthereumProviderIdentifier, exact?: boolean): EIP6963ProviderDetail | undefined {

    const exactMatch = getMatchedEthereumProviders(providers, identifier, true);

    if (exactMatch || exact) {

        return exactMatch;
    }

    const fuzzyMatch = getMatchedEthereumProviders(providers, identifier);

    return fuzzyMatch?.length === 1
        ? fuzzyMatch[0]
        : undefined;
}

/**
 * Get the index of the EIP-6963 provider (browser wallet) that matches the given identifier.
 *
 * @see
 * {@link getEthereumProvider}
 */
export function getEthereumProviderIndex (providers: EIP6963ProviderDetail[], identifier?: EthereumProviderIdentifier, exact?: boolean): number | undefined {

    const match = getEthereumProvider(providers, identifier, exact);

    return match
        ? providers.indexOf(match)
        : undefined;
}

export type EthereumProviderIdentifier = Omit<EIP6963ProviderInfo, 'icon'>;

/**
 * Get an identifier object for the given EIP-6963 provider.
 */
export function getEthereumProviderIdentifier (provider?: EIP6963ProviderDetail): EthereumProviderIdentifier | undefined {

    return provider
        ? {
            name: provider.info.name,
            rdns: provider.info.rdns,
            uuid: provider.info.uuid,
        }
        : undefined;
}

/**
 * Get the detected EIP-6963 provider that matches the given identifier exactly.
 */
export function getMatchedEthereumProviders (providers: EIP6963ProviderDetail[], identifier: EthereumProviderIdentifier | undefined, exact: true): EIP6963ProviderDetail | undefined;
/**
 * Get a list of all detected EIP-6963 providers that 'fuzzy'-match the given identifier.
 */
export function getMatchedEthereumProviders (providers: EIP6963ProviderDetail[], identifier?: EthereumProviderIdentifier, exact?: false | undefined): EIP6963ProviderDetail[] | undefined;
export function getMatchedEthereumProviders (providers: EIP6963ProviderDetail[], identifier?: EthereumProviderIdentifier, exact?: boolean): EIP6963ProviderDetail | EIP6963ProviderDetail[] | undefined {

    const matches = providers.filter(provider => matchEthereumProvider(provider, identifier, exact));

    return exact
        ? matches[0]
        : matches.length
            ? matches
            : undefined;
}

/**
 * Check if the given EIP-6963 provider matches the given identifier.
 */
export function matchEthereumProvider (provider?: EIP6963ProviderDetail, identifier?: EthereumProviderIdentifier, exact?: boolean): boolean {

    const providerIdentifier = getEthereumProviderIdentifier(provider);

    return matchEthereumProviderIdentifiers(providerIdentifier, identifier, exact);
}

/**
 * Check if the given provider identifiers matches.
 */
export function matchEthereumProviderIdentifiers (identifier?: EthereumProviderIdentifier, otherIdentifier?: EthereumProviderIdentifier, exact?: boolean): boolean {

    return identifier?.name === otherIdentifier?.name
        && identifier?.rdns === otherIdentifier?.rdns
        && (!exact || identifier?.uuid === otherIdentifier?.uuid);
}



/**
 * Represents the assets needed to display a wallet
 */
export interface EIP6963ProviderInfo {
    icon: string;
    name: string;
    rdns: string;
    uuid: string;
}

export interface EIP6963ProviderDetail {
    info: EIP6963ProviderInfo;
    provider: EIP1193Provider;
}

export const ANNOUNCE_PROVIDER_EVENT = 'eip6963:announceProvider';

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
    type: typeof ANNOUNCE_PROVIDER_EVENT;
    detail: EIP6963ProviderDetail;
}

export const REQUEST_PROVIDER_EVENT = 'eip6963:requestProvider';

export interface EIP6963RequestProviderEvent extends Event {
    type: typeof REQUEST_PROVIDER_EVENT;
}

declare global {

    interface WindowEventMap {
        [ANNOUNCE_PROVIDER_EVENT]: EIP6963AnnounceProviderEvent;
        [REQUEST_PROVIDER_EVENT]: EIP6963RequestProviderEvent;
    }
}



// ----------------------
// intenal implementation
// ----------------------

// detected providers
let EIP1193_PROVIDERS: EIP6963ProviderDetail[] = [];

/**
 * Detect multiple injected wallet providers.
 *
 * @remarks
 * https://eips.ethereum.org/EIPS/eip-6963
 *
 * Discover EIP-1193 providers using the EIP-6963 specification. This avoids accessing the global
 * `window.ethereum` object directly, which can cause issues when using multiple wallets.
 */
const detectProviders = async (): Promise<EIP6963ProviderDetail[]> => {

    return new Promise((resolve) => {

        if (document.readyState === 'loading') {

            window.addEventListener('DOMContentLoaded', () => {

                resolve(requestProviders());

            }, { once: true });

        } else {

            resolve(requestProviders());
        }
    });
};

// request providers
const requestProviders = async (): Promise<EIP6963ProviderDetail[]> => {

    // reset previously stored providers
    EIP1193_PROVIDERS = [];

    return new Promise((resolve) => {

        // listen for provider announcements
        window.addEventListener(ANNOUNCE_PROVIDER_EVENT, announceProvider);

        // request providers
        window.dispatchEvent(new Event(REQUEST_PROVIDER_EVENT));

        // events should be dispatched synchronously, but just in case we wait a tick
        setTimeout(() => {

            window.removeEventListener(ANNOUNCE_PROVIDER_EVENT, announceProvider);

            resolve(EIP1193_PROVIDERS);

        }, 0);
    });
};

// handle announced providers
const announceProvider = (event: EIP6963AnnounceProviderEvent): void => {

    EIP1193_PROVIDERS.push(event.detail);
};
