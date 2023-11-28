import { Connection } from '../connection/interfaces.js';
import { ExcludeState, IncludeState, Member } from '../utils/types.js';

/**
 * The wallet status.
 */
export const WALLET_STATUS = {
    DISCONNECTING: 'disconnecting',
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error',
} as const;

export type WalletStatus = Member<typeof WALLET_STATUS>;

/**
 * The wallet state.
 *
 * @remarks
 * The wallet state depends on the wallet's status.
 */
export type WalletState = WalletStateConnected | WalletStateDisconnected | WalletStateError;

/**
 * The initial wallet state.
 */
export const INITIAL_STATE: WalletState = {
    status: WALLET_STATUS.DISCONNECTED,
    connection: undefined,
    error: undefined,
};

/**
 * The internal wallet state from which we build the status dependent wallet states.
 */
type WalletStateDefault<S extends WalletStatus = WalletStatus> = {
    status: S;
    connection?: Connection;
    error?: Error;
};

/* eslint-disable @typescript-eslint/indent */

type WalletStateConnected = IncludeState<
    WalletStateDefault<typeof WALLET_STATUS.CONNECTED>,
    'connection'
>;

type WalletStateDisconnected = ExcludeState<
    WalletStateDefault<typeof WALLET_STATUS.DISCONNECTED | typeof WALLET_STATUS.DISCONNECTING | typeof WALLET_STATUS.CONNECTING>,
    'connection' | 'error'
>;

type WalletStateError = IncludeState<
    WalletStateDefault<typeof WALLET_STATUS.ERROR>,
    'error'
>;

/* eslint-enable @typescript-eslint/indent */
