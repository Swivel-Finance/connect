import { Wallet, providers } from 'ethers';
import { ListenerManager, schedule } from '../../../utils/index.js';
import { CONNECTION_EVENTS, type Account, type ConnectionEvents, type ConnectionProvider } from '../../interfaces.js';
import { DEFAULT_CONNECTION_OPTIONS, RpcConnection, RpcConnectionOptions } from './connection.js';

/**
 * A connection provider connecting via an RPC endpoint and a private key.
 *
 * @remarks
 * This connection provider is useful in node environments, where we don't have
 * access to a web3 wallet.
 */
export class RPCConnectionProvider implements ConnectionProvider {

    protected options: RpcConnectionOptions;

    protected listenable = new ListenerManager<ConnectionEvents>();

    protected cache = {
        options: undefined as RpcConnectionOptions | undefined,
        connection: undefined as RpcConnection | undefined,
        metamaskReconnect: false,
    };

    get connection (): RpcConnection | undefined {

        return this.cache.connection;
    }

    get connected (): boolean {

        return !!this.cache.connection;
    }

    constructor (options: RpcConnectionOptions) {

        this.options = {
            ...DEFAULT_CONNECTION_OPTIONS,
            ...options,
        };
    }

    async connect (options?: Partial<RpcConnectionOptions>): Promise<RpcConnection> {

        // merge the default options with the provided options
        const connectionOptions = options
            ? { ...this.options, ...options }
            : this.cache.options ?? { ...this.options };

        // check if we have a cached connection matching the current connection options
        const cachedConnection = this.getCachedConnection(connectionOptions);

        if (cachedConnection) {

            return cachedConnection;
        }

        const provider = new providers.JsonRpcProvider(connectionOptions.url, connectionOptions.chainId);

        const signer = new Wallet(connectionOptions.privateKey, provider);

        const network = await provider.getNetwork().catch(() => provider.network);

        const address = await signer.getAddress();

        const ensAddress = await provider.lookupAddress(address).catch((error) => console.warn(`ENS lookup failed for ${ address }: `, error)) ?? undefined;

        const account: Account = { address, ensAddress };

        // cache the connection and options
        this.cache.connection = {
            network,
            account,
            provider,
            signer,
        };

        this.cache.options = connectionOptions;

        // dispatch the connect event after returning the connection from this method
        void schedule(() => this.listenable.dispatch(CONNECTION_EVENTS.CONNECT, this.connection!));

        return this.cache.connection;
    }

    disconnect (error?: Error): void {

        if (error) console.error(error);

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

    protected getCachedConnection (options?: Partial<RpcConnectionOptions>): RpcConnection | undefined {

        if (this.connected) {

            const connectionOptions = { ...this.options, ...options };
            const cachedOptions = this.cache.options;

            const cacheHit = cachedOptions?.chainId === connectionOptions.chainId
                && cachedOptions?.url === connectionOptions.url
                && cachedOptions?.privateKey === connectionOptions.privateKey;

            if (cacheHit) {

                return this.cache.connection;
            }
        }
    }
}
