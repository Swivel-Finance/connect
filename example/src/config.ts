import { WALLET_STATUS, WalletService, getEthereumProvider, getEthereumProviderIdentifier, getEthereumProviders, isBrowserConnection } from '@swivel-finance/connect';
import { BrowserConnectionProvider } from '@swivel-finance/connect/connection/providers/browser/provider.js';
import { preferences } from './preferences.js';

const reload = () => window.location.reload();

// instantiate the wallet service with a connection provider
// this can be done using a service locator pattern as well
const walletService = new WalletService({
    connectionProvider: new BrowserConnectionProvider({
        chainId: 1,
    }),
    // or
    // connectionProvider: new MockConnectionProvider(),
    // or
    // connectionProvider: new RPCConnectionProvider({...}),
});

walletService.listen('connect', (connection) => {

    console.log('[config] walletService.connect...', connection);

    if (isBrowserConnection(connection)) {

        const walletIdentifier = getEthereumProviderIdentifier(connection.wallet);

        if (walletIdentifier) {

            preferences.set('walletIdentifier', walletIdentifier);
        }
    }

    preferences.set('autoConnect', true);
});

walletService.listen('disconnect', (error) => {

    console.log('[config] walletService.disconnect...', error);

    // TODO: check interactivity service if page is currently active...

    if (!error) {

        preferences.delete('autoConnect');
    }
});

walletService.listen('accountsChanged', async (accounts) => {

    // TODO: check interactivity service if page is currently active...

    console.log('[config] walletService.accountsChanged...', accounts);

    // we can update the wallet connection by reconnecting the wallet service
    if (walletService.state.status === WALLET_STATUS.CONNECTED) {

        await walletService.disconnect();

        // a user might have disconnected all their accounts, in which case we can't connect
        if (accounts.length > 0) {

            // calling `connect` without any options will use the last used options
            await walletService.connect();
        }
    }
});

walletService.listen('chainChanged', (chainId) => {

    // TODO: check interactivity service if page is currently the active tab...
    // if yes, we should reload
    // if not, we should disconnect

    console.log('[config] walletService.chainChanged...', chainId);

    // on chain changes it is advised to reload the page
    reload();

    // we could also check which chain the user has changed to and redirect to a matching deployment...
});

// handle auto connect on page load
window.addEventListener('load', async () => {

    const autoConnect = preferences.get('autoConnect');

    if (autoConnect) {

        // the `walletIdentifier` is not gonna exactly match any wallet in the detected
        // providers as its `uuid` is re-generated on each page load
        // we use it fuzzy-match a provider and recreate the identifier to match exactly
        let walletIdentifier = preferences.get('walletIdentifier');

        // get the available browser wallet providers
        const providers = await getEthereumProviders();

        // get the last connected browser wallet provider by fuzzy-matching the stored identifier
        // this also makes sure we don't accidentally connect to a malicious wallet
        const provider = getEthereumProvider(providers, walletIdentifier);

        // recreate the identifier to match the provider exactly
        walletIdentifier = getEthereumProviderIdentifier(provider);

        // if we were able to find a matching provider, connect the wallet service
        if (walletIdentifier) {

            const connection = await config.wallet.connect({ walletIdentifier });

            console.log('autoConnect: ', connection);
        }

        // in a mock configuration, we can simply connect the wallet service
        // in an rpc configuration, we can simply connect the wallet service (the connection is usually configured during instantiation)
        // await config.wallet.connect();
    }
});

export const config = {
    wallet: walletService,
};

// some code that depends on a connection
// eslint-disable-next-line @typescript-eslint/require-await
void walletService.connection().then(async (connection) => {

    console.warn('We have a connection! On we go... ', connection);

    // some 'wallet'-functionality depends on the type of connection we have
    // for example, we can only watch assets on a browser wallet connection
    // generally speaking, most advanced features are only available on browser wallet connections
    // we can check the connection type using the `isBrowserConnection` type guard
    // with that in place, we can use a host of rpc requests that are only available on browser wallet connections (EIP-1193 providers)
    // and defined in 'src/connection/providers/browser/ethereum-provider/api.ts'
    // if (isBrowserConnection(connection)) {

    //     try {

    //         // Phantom wallet doesn't support `wallet_watchAsset` yet
    //         await watchAsset(connection.wallet.provider, {
    //             type: 'ERC20',
    //             options: {
    //                 address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    //                 symbol: 'stETH',
    //                 decimals: 18,
    //             },
    //         });

    //     } catch (error) {

    //         console.error(error);
    //     }
    // }
});

void walletService.connection().then((connection) => {

    console.warn('Another listener for a connection... ', connection);
});
