import { providers } from 'ethers';
import { ListenerManager, schedule } from '../../../utils/index.js';
import { ERRORS } from '../../errors.js';
import { CONNECTION_EVENTS, type Account, type ConnectionEvents, type ConnectionProvider } from '../../interfaces.js';
import { BrowserConnection, BrowserConnectionOptions, DEFAULT_CONNECTION_OPTIONS } from './connection.js';
import { getAccounts, getChain, switchChain } from './ethereum-provider/api.js';
import { PROVIDER_EVENTS, ProviderConnectInfo, ProviderRpcError } from './ethereum-provider/eip-1193.js';
import { EIP6963ProviderDetail, getEthereumProvider, getEthereumProviderIdentifier, getEthereumProviders, matchEthereumProviderIdentifiers } from './ethereum-provider/eip-6963.js';

/**
 * A connection provider connecting via a browser wallet.
 */
export class BrowserConnectionProvider implements ConnectionProvider {

    protected options: BrowserConnectionOptions;

    protected listenable = new ListenerManager<ConnectionEvents>();

    protected cache = {
        options: undefined as BrowserConnectionOptions | undefined,
        connection: undefined as BrowserConnection | undefined,
        metamaskReconnect: false,
    };

    get connection (): BrowserConnection | undefined {

        return this.cache.connection;
    }

    get connected (): boolean {

        return !!this.cache.connection;
    }

    constructor (options?: Partial<BrowserConnectionOptions>) {

        this.options = {
            ...DEFAULT_CONNECTION_OPTIONS,
            ...options,
        };

        this.handleConnect = this.handleConnect.bind(this);
        this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
        this.handleChainChanged = this.handleChainChanged.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
    }

    async connect (options?: Partial<BrowserConnectionOptions>): Promise<BrowserConnection> {

        // merge the default options with the provided options
        const connectionOptions = options
            ? { ...this.options, ...options }
            : this.cache.options ?? { ...this.options };

        // get the browser wallet to connect to (the options must contain a wallet identifier)
        const wallet = await this.getEthereumProvider(connectionOptions);

        if (!wallet) {

            throw ERRORS.WALLET_UNSPECIFIED();
        }

        // ensure the browser wallet identifier is stored in the connection options
        // connectionOptions.walletId = getProviderId(wallet);
        connectionOptions.walletIdentifier = getEthereumProviderIdentifier(wallet);

        // check if we have a cached connection matching the current connection options
        const cachedConnection = this.getCachedConnection(connectionOptions);

        // if we do, return our cached connection instead of connecting again
        if (cachedConnection) {

            return cachedConnection;
        }

        // ensure the wallet is connected to the correct chain
        const chainId = await getChain(wallet.provider);

        if (chainId !== connectionOptions.chainId) {

            try {

                await switchChain(wallet.provider, connectionOptions.chainId);

            } catch (error) {

                console.error(error);

                throw ERRORS.NETWORK_MISMATCH(connectionOptions.chainId);
            }
        }

        // request account access from the wallet
        const addresses = await getAccounts(wallet.provider);

        // create an ethers provider
        const provider = new providers.Web3Provider(wallet.provider, connectionOptions.chainId);

        // get the network information
        const network = await provider.getNetwork();

        // lookup ens names for connected accounts
        const accounts = await Promise.all<Account>(addresses.map(async (address) => {
            const ensAddress = await provider.lookupAddress(address)
                .catch((error) => {
                    console.warn(`ENS lookup failed for ${ address }: `, error);
                }) ?? undefined;
            return { address, ensAddress };
        }));

        // set the connected account
        const account = accounts[0];

        // create an ethers signer
        const signer = provider.getSigner(account.address);

        // cache the connection and options
        this.cache.connection = {
            network,
            account,
            accounts,
            provider,
            signer,
            wallet,
        };

        this.cache.options = connectionOptions;

        // listen for wallet provider events
        // eslint-disable-next-line @typescript-eslint/unbound-method
        wallet.provider.on(PROVIDER_EVENTS.CONNECT, this.handleConnect);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        wallet.provider.on(PROVIDER_EVENTS.ACCOUNTS_CHANGED, this.handleAccountsChanged);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        wallet.provider.on(PROVIDER_EVENTS.CHAIN_CHANGED, this.handleChainChanged);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        wallet.provider.on(PROVIDER_EVENTS.DISCONNECT, this.handleDisconnect);

        // dispatch the connect event after returning the connection from this method
        void schedule(() => this.listenable.dispatch(CONNECTION_EVENTS.CONNECT, this.connection!));

        return this.cache.connection;
    }

    disconnect (error?: ProviderRpcError): void {

        if (error) console.error(error);

        const wallet = this.connection?.wallet;

        // eslint-disable-next-line @typescript-eslint/unbound-method
        wallet?.provider.removeListener(PROVIDER_EVENTS.CONNECT, this.handleConnect);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        wallet?.provider.removeListener(PROVIDER_EVENTS.ACCOUNTS_CHANGED, this.handleAccountsChanged);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        wallet?.provider.removeListener(PROVIDER_EVENTS.CHAIN_CHANGED, this.handleChainChanged);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        wallet?.provider.removeListener(PROVIDER_EVENTS.DISCONNECT, this.handleDisconnect);

        this.cache.connection = undefined;

        // dispatch the disconnect event after returning from this method
        void schedule(() => this.listenable.dispatch(CONNECTION_EVENTS.DISCONNECT, error));
    }

    listen<K extends keyof ConnectionEvents> (type: K, listener: ConnectionEvents[K]): void {

        this.listenable.listen(type, listener);
    }

    unlisten<K extends keyof ConnectionEvents> (type: K, listener: ConnectionEvents[K]): void {

        this.listenable.unlisten(type, listener);
    }

    /**
     * Handle the 'connect' event from the browser wallet provider.
     *
     * @remarks
     * > The provider emits this event when it's first able to submit RPC requests to a chain.
     * > (https://docs.metamask.io/wallet/reference/provider-api/#connect)
     *
     * Typically, we don't see this event, as the browser wallet is already connected to a chain
     * when we connect to it. We only tend to see this event with MetaMask, when the user switches
     * networks and the browser wallet disconnects and reconnects automatically.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected handleConnect (info: ProviderConnectInfo) {

        // if we have a cached connection when this event occurs, disconnect
        // and reconnect to ensure we have the latest connection information
        if (this.connected) {

            // if this is a MetaMask reconnect, we ignore it and wait for the 'chainChanged' event
            // to ensure MetaMask behaves like other wallets during network switches
            if (this.cache.metamaskReconnect) {

                this.cache.metamaskReconnect = false;

                return;
            }

            this.disconnect();

            void this.connect();
        }
    }

    /**
     * Handle the 'disconnect' event from the browser wallet provider.
     *
     * @remarks
     * > The provider emits this event if it becomes unable to submit RPC requests to a chain.
     * > In general, this only happens due to network connectivity issues or some unforeseen error.
     * > (https://docs.metamask.io/wallet/reference/provider-api/#disconnect)
     *
     * MetaMask will often emit this event when the user switches networks, followed by a 'connect'
     * and 'chainChanged' event. Other wallets appear to only emit the 'chainChanged' event in this
     * scenario, also MetaMask sometimes only emits the 'chainChanged' event.
     * (https://github.com/MetaMask/metamask-extension/issues/13375)
     */
    protected handleDisconnect (error: ProviderRpcError) {

        // handle MetaMask's disconnect error when switching networks
        // ("Error: MetaMask: Disconnected from chain. Attempting to connect.")
        if (error.code === 1013) {

            // we know that MetaMask will reconnect automatically and dispatch a 'chainChanged' event
            // after successfully reconnecting, so we can ignore this disconnect error and align
            // MetaMask's behaviour with other wallets
            this.cache.metamaskReconnect = true;

            return;
        }

        // disconnect the provider to clear the cached connection
        this.disconnect(error);
    }

    protected handleAccountsChanged (accounts: string[]) {

        this.listenable.dispatch(CONNECTION_EVENTS.ACCOUNTS_CHANGED, accounts);
    }

    protected handleChainChanged (chainId: string) {

        this.listenable.dispatch(CONNECTION_EVENTS.CHAIN_CHANGED, parseInt(chainId, 16));
    }

    protected getCachedConnection (options?: Partial<BrowserConnectionOptions>): BrowserConnection | undefined {

        if (this.connected) {

            const connectionOptions = { ...this.options, ...options };
            const cachedOptions = this.cache.options;

            const cacheHit = cachedOptions?.chainId === connectionOptions.chainId
                && matchEthereumProviderIdentifiers(cachedOptions.walletIdentifier, connectionOptions.walletIdentifier, true);

            if (cacheHit) {

                return this.cache.connection;
            }
        }
    }

    protected async getEthereumProvider (options?: Partial<BrowserConnectionOptions>): Promise<EIP6963ProviderDetail | undefined> {

        const wallets = await getEthereumProviders();

        // if we don't have any wallets installed, we can't connect
        if (!wallets.length) {

            throw ERRORS.WALLET_UNAVAILABLE();
        }

        // if we only have a single wallet, we use it
        if (wallets.length === 1) {

            return wallets[0];
        }

        // if we have multiple wallets, we use the one matching the wallet identifier
        const wallet = getEthereumProvider(wallets, options?.walletIdentifier);

        return wallet;
    }
}
