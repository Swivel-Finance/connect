import { BigNumber, utils } from 'ethers';
import { WALLET_STATUS, WalletState } from '@swivel-finance/connect';
import { EIP6963ProviderDetail, getEthereumProvider, getEthereumProviderIdentifier, getEthereumProviders } from '@swivel-finance/connect/connection/providers/browser/ethereum-provider/index.js';
import { config } from './config.js';
import { preferences } from './preferences.js';
import { WalletListElement } from './wallet-list.js';

const template = function (this: WalletElement): string {

    const state = this.wallet.state;
    const status = state.status;

    return `
    ${ status === WALLET_STATUS.CONNECTED
        ? `
        <div>
            <div>Network: ${ state.connection.network.name } (${ state.connection.network.chainId })</div>
            <div>Address: ${ state.connection.account.ensAddress ? `${ state.connection.account.ensAddress } (${ state.connection.account.address })` : state.connection.account.address }</div>
            <div>Balance: ${ this.balance ? utils.formatEther(this.balance) : '--' } ETH</div>
        </div>
        <button>Disonnect Wallet</button>
        `
        : status === WALLET_STATUS.CONNECTING
            ? '<button disabled>Connecting...</button>'
            : status === WALLET_STATUS.ERROR
                ? `
                <wallet-list-element></wallet-list-element>
                <button>Retry</button>
                <div>${ state.error?.message ?? 'An unexpected error occured. Try reloading the page.' }</div>
                `
                : `
                <wallet-list-element></wallet-list-element>
                <button>Connect Wallet</button>
                `
    }
    `;
};

export class WalletElement extends HTMLElement {

    static tagName = 'wallet-element';

    protected updateDone?: Promise<void>;

    protected wallet = config.wallet;

    protected providers: EIP6963ProviderDetail[] = [];

    protected selectedProvider?: EIP6963ProviderDetail;

    protected balance?: BigNumber;

    protected button?: HTMLButtonElement;

    protected list?: WalletListElement;

    constructor () {

        super();

        this.handleWallet = this.handleWallet.bind(this);
    }

    connectedCallback (): void {

        void this.updateProviders();

        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.wallet.subscribe(this.handleWallet);

        void this.scheduleUpdate();
    }

    disconnectedCallback (): void {

        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.wallet.unsubscribe(this.handleWallet);
    }

    protected async connectWallet (): Promise<void> {

        // update the available browser wallet providers
        // (app could have been open and disconnected for a while, so we need to check again)
        await this.updateProviders();

        await this.wallet.connect({
            walletIdentifier: getEthereumProviderIdentifier(this.selectedProvider),
        });
    }

    protected async disconnectWallet (): Promise<void> {

        await this.wallet.disconnect();
    }

    protected scheduleUpdate (): Promise<void> {

        if (!this.updateDone) {

            this.updateDone = new Promise((resolve) => {

                requestAnimationFrame(() => {

                    this.render();
                    this.updateDone = undefined;
                    resolve();
                });
            });
        }

        return this.updateDone;
    }

    protected render (): void {

        this.innerHTML = template.call(this);

        this.button = this.querySelector<HTMLButtonElement>('button') ?? undefined;

        this.button?.addEventListener('click', () => this.wallet.state.status === WALLET_STATUS.CONNECTED ? this.disconnectWallet() : this.connectWallet());

        this.list = this.querySelector<WalletListElement>('wallet-list-element') ?? undefined;

        this.list?.addEventListener('wallet-selected', (event) => this.selectedProvider = event.detail);

        if (this.list) {

            this.list.wallets = this.providers;
            this.list.selected = this.selectedProvider;
        }
    }

    protected handleWallet (state: WalletState): void {

        if (state.status === WALLET_STATUS.CONNECTED) {

            void this.updateBalance();
        }

        void this.scheduleUpdate();
    }

    protected async updateProviders (): Promise<void> {

        // get the available browser wallet providers
        this.providers = await getEthereumProviders();

        // if we have don't have multiple providers, use the one installed
        if (this.providers.length <= 1) {

            this.selectedProvider = this.providers[0];

        } else {

            // get the last connected browser wallet provider
            const identifier = this.selectedProvider
                ? getEthereumProviderIdentifier(this.selectedProvider)
                : preferences.get('walletIdentifier');

            // check if the last connected browser wallet provider is still available
            this.selectedProvider = getEthereumProvider(this.providers, identifier);
        }

        void this.scheduleUpdate();
    }

    protected async updateBalance (): Promise<void> {

        const state = this.wallet.state;

        if (state.status !== WALLET_STATUS.CONNECTED) return;

        const { connection } = state;

        try {

            this.balance = await connection.provider.getBalance(connection.account.address);

        } catch (error) {

            console.error(error);

            this.balance = undefined;
        }

        void this.scheduleUpdate();
    }
}

customElements.define(WalletElement.tagName, WalletElement);
