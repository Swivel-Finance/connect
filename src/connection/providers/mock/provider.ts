import { Provider } from '@ethersproject/abstract-provider';
import { Signer } from '@ethersproject/abstract-signer';
import { BigNumber } from 'ethers';
import { ListenerManager, schedule } from '../../../utils/index.js';
import { CONNECTION_EVENTS, type ConnectionEvents, type ConnectionProvider } from '../../interfaces.js';
import { DEFAULT_CONNECTION_OPTIONS, MockConnection, MockConnectionOptions } from './connection.js';

const MOCK_DELAY = async (delay = 500): Promise<void> => {

    await new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * A mock connection provider.
 *
 * @remarks
 * This connection provider is useful for testing purposes or
 * for product demos when no internet connection is available.
 */
export class MockConnectionProvider implements ConnectionProvider {

    protected options: MockConnectionOptions;

    protected listenable = new ListenerManager<ConnectionEvents>();

    protected cache = {
        options: undefined as MockConnectionOptions | undefined,
        connection: undefined as MockConnection | undefined,
    };

    get connection (): MockConnection | undefined {

        return this.cache.connection;
    }

    get connected (): boolean {

        return !!this.cache.connection;
    }

    constructor (options?: Partial<MockConnectionOptions>) {

        this.options = {
            ...DEFAULT_CONNECTION_OPTIONS,
            ...options,
        };
    }

    async connect (options?: Partial<MockConnectionOptions>): Promise<MockConnection> {

        // merge the default options with the provided options
        const connectionOptions = options
            ? { ...this.options, ...options }
            : this.cache.options ?? { ...this.options };

        // check if we have a cached connection matching the current connection options
        const cachedConnection = this.getCachedConnection(connectionOptions);

        if (cachedConnection) {

            return cachedConnection;
        }

        // simulate some delay while establishing a connection...
        await MOCK_DELAY();

        // a mock provider to get an ETH balance
        const provider = {
            getBalance: () => Promise.resolve(BigNumber.from(connectionOptions.ethBalance)),
        } as unknown as Provider;

        // a mock signer
        const signer = {} as Signer;

        // cache the connection and options
        this.cache.connection = {
            network: {
                chainId: connectionOptions.chainId,
                name: connectionOptions.networkName,
            },
            account: {
                address: connectionOptions.address,
                ensAddress: connectionOptions.ensAddress,
            },
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

    protected getCachedConnection (options?: Partial<MockConnectionOptions>): MockConnection | undefined {

        if (this.connected) {

            const connectionOptions = { ...this.options, ...options };
            const cachedOptions = this.cache.options;

            const cacheHit = cachedOptions?.chainId === connectionOptions.chainId
                && cachedOptions?.networkName === connectionOptions.networkName
                && cachedOptions?.address === connectionOptions.address
                && cachedOptions?.ensAddress === connectionOptions.ensAddress
                && cachedOptions?.ethBalance === connectionOptions.ethBalance;

            if (cacheHit) {

                return this.cache.connection;
            }
        }
    }
}
