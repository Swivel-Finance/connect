import { CONNECTION_EVENTS, Connection, ConnectionEvents, ConnectionOptions, ConnectionProvider } from '../connection/interfaces.js';
import { PromiseController } from '../utils/index.js';
import { Listenable, ListenerManager } from '../utils/listenable.js';
import { Observable, ObserverManager } from '../utils/observable.js';
import { INITIAL_STATE, WALLET_STATUS, WalletState } from './state.js';

export interface WalletServiceOptions {
    connectionProvider: ConnectionProvider;
}

export class WalletService implements Listenable<ConnectionEvents>, Observable<WalletState> {

    protected connectionProvider: ConnectionProvider;

    protected internalState: WalletState = INITIAL_STATE;

    protected cachedState: WalletState = Object.freeze({ ...INITIAL_STATE });

    protected connecting?: PromiseController<Connection>;

    protected disconnecting?: PromiseController<void>;

    protected listenable = new ListenerManager<ConnectionEvents>();

    protected observable = new ObserverManager<WalletState>();

    /**
     * The current wallet state.
     */
    get state (): Readonly<WalletState> {

        // return the frozen cached state to minimize the risk of state mutations by consumers
        return this.cachedState;
    }

    /**
     * Create a new wallet service instance.
     */
    constructor (options: WalletServiceOptions) {

        this.connectionProvider = options.connectionProvider;

        this.handleConnect = this.handleConnect.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
        this.handleChainChanged = this.handleChainChanged.bind(this);
        this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    }

    /**
     * Connect the wallet service to the blockchain using its connection provider.
     */
    connect (options?: Partial<ConnectionOptions>): Promise<Connection> {

        // if we are already connected, return the current connection
        if (this.state.status === WALLET_STATUS.CONNECTED) return Promise.resolve(this.state.connection);

        // if we are not connected, ensure we have a connection promise
        if (!this.connecting) {

            this.connecting = new PromiseController<Connection>();
        }

        // if we are connecting, return the connection promise
        if (this.state.status === WALLET_STATUS.CONNECTING) return this.connecting.promise;

        // if we are disconnecting, wait for the disconnect to complete before
        // initiating a new connection and return the connection promise
        if (this.state.status === WALLET_STATUS.DISCONNECTING) {

            void (this.disconnecting?.promise ?? Promise.resolve()).finally(() => this.connect(options));

            return this.connecting.promise;
        }

        void this._connect(options);

        return this.connecting.promise;
    }

    /**
     * Disconnect the wallet service from the blockchain using its connection provider.
     */
    disconnect (): Promise<void> {

        // if we are already disconnected, return
        if (this.state.status === WALLET_STATUS.DISCONNECTED) return Promise.resolve();

        // if we are not disconnecting, ensure we have a disconnecting promise
        if (!this.disconnecting) {

            this.disconnecting = new PromiseController<void>();
        }

        // if we are disconnecting, return the disconnecting promise
        if (this.state.status === WALLET_STATUS.DISCONNECTING) return this.disconnecting.promise;

        // if we are connecting, wait for the connect to complete before
        // initiating a new disconnect and return the disconnecting promise
        if (this.state.status === WALLET_STATUS.CONNECTING) {

            void (this.connecting?.promise ?? Promise.resolve()).finally(() => this.disconnect());

            return this.disconnecting.promise;
        }

        void this._disconnect();

        return this.disconnecting.promise;
    }

    /**
     * Request a connection from the wallet service without initiating a connect.
     *
     * @remarks
     * This method returns a promise that resolves with a {@link Connection} when the wallet service is connected.
     * If the wallet service is already connected, the current connection will be returned.
     *
     * **NOTE**: This method will not initiate a connection, use {@link connect} for that.
     */
    connection (): Promise<Connection> {

        if (this.state.status === WALLET_STATUS.CONNECTED) return Promise.resolve(this.state.connection);

        if (!this.connecting) {

            this.connecting = new PromiseController<Connection>();
        }

        return this.connecting.promise;
    }

    /**
     * Listen for connection events.
     */
    listen<K extends keyof ConnectionEvents> (type: K, listener: ConnectionEvents[K]): void {

        this.listenable.listen(type, listener);
    }

    /**
     * Stop listening for connection events.
     */
    unlisten<K extends keyof ConnectionEvents> (type: K, listener: ConnectionEvents[K]): void {

        this.listenable.unlisten(type, listener);
    }

    /**
     * Subscribe to wallet state changes.
     */
    subscribe (subscriber: (state: WalletState) => unknown) {

        this.observable.subscribe(subscriber);
    }

    /**
     * Unsubscribe from wallet state changes.
     */
    unsubscribe (subscriber: (state: WalletState) => unknown) {

        this.observable.unsubscribe(subscriber);
    }

    protected async _connect (options?: Partial<ConnectionOptions>): Promise<void> {

        try {

            // transition to connecting state
            this.updateState({
                status: WALLET_STATUS.CONNECTING,
            });

            // add provider listeners
            this.addProviderListeners();

            await this.connectionProvider.connect(options);

        } catch (error) {

            console.warn(error);

            this.removeProviderListeners();

            this.updateState({
                ...this.state,
                status: WALLET_STATUS.ERROR,
                error: error as Error,
            });

            this.connecting?.reject(error);
            this.connecting = undefined;
        }
    }

    protected async _disconnect (): Promise<void> {

        try {

            // transition to disconnecting state
            this.updateState({
                status: WALLET_STATUS.DISCONNECTING,
            });

            await this.connectionProvider.disconnect();

            // remove provider listeners
            this.removeProviderListeners();

        } catch (error) {

            console.warn(error);

            this.updateState({
                ...this.state,
                status: WALLET_STATUS.ERROR,
                error: error as Error,
            });

            this.disconnecting?.reject(error);
            this.disconnecting = undefined;
        }
    }

    protected updateState (state: WalletState) {

        this.internalState = state;

        this.cachedState = Object.freeze({ ...this.internalState });

        this.observable.notify(this.state);
    }

    protected addProviderListeners () {

        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.connectionProvider.listen(CONNECTION_EVENTS.CONNECT, this.handleConnect);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.connectionProvider.listen(CONNECTION_EVENTS.DISCONNECT, this.handleDisconnect);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.connectionProvider.listen(CONNECTION_EVENTS.CHAIN_CHANGED, this.handleChainChanged);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.connectionProvider.listen(CONNECTION_EVENTS.ACCOUNTS_CHANGED, this.handleAccountsChanged);
    }

    protected removeProviderListeners () {

        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.connectionProvider.unlisten(CONNECTION_EVENTS.CONNECT, this.handleConnect);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.connectionProvider.unlisten(CONNECTION_EVENTS.DISCONNECT, this.handleDisconnect);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.connectionProvider.unlisten(CONNECTION_EVENTS.CHAIN_CHANGED, this.handleChainChanged);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.connectionProvider.unlisten(CONNECTION_EVENTS.ACCOUNTS_CHANGED, this.handleAccountsChanged);
    }

    protected handleConnect (connection: Connection) {

        this.updateState({
            status: WALLET_STATUS.CONNECTED,
            connection,
        });

        this.connecting?.resolve(connection);
        this.connecting = undefined;

        this.listenable.dispatch(CONNECTION_EVENTS.CONNECT, connection);
    }

    protected handleDisconnect (error?: Error) {

        this.updateState({
            status: WALLET_STATUS.DISCONNECTED,
        });

        this.disconnecting?.resolve();
        this.disconnecting = undefined;

        this.listenable.dispatch(CONNECTION_EVENTS.DISCONNECT, error);
    }

    protected handleChainChanged (chainId: number) {

        this.listenable.dispatch(CONNECTION_EVENTS.CHAIN_CHANGED, chainId);
    }

    protected handleAccountsChanged (accounts: string[]) {

        this.listenable.dispatch(CONNECTION_EVENTS.ACCOUNTS_CHANGED, accounts);
    }
}
