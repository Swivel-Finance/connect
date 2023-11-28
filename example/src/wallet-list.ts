import { EIP6963ProviderDetail, getEthereumProviderIdentifier, getEthereumProviderIndex } from '@swivel-finance/connect/connection/providers/browser/ethereum-provider/index.js';

const template = function (this: WalletListElement): string {

    return `
    ${ this.wallets.map((wallet, index) => `
        <div class="list-item ${ index === this._selected ? 'selected' : '' }" data-index="${ index }">
            <span class="selection"></span>
            <img class="icon" src="${ wallet.info.icon }" alt="${ wallet.info.name }" />
            <span class="name">${ wallet.info.name }</span>
            <span class="detail">${ wallet.info.rdns }</span>
            <span class="detail">${ wallet.info.uuid }</span>
        </div>
    `).join('') }
    `;
};

export class WalletSelectEvent extends CustomEvent<EIP6963ProviderDetail | undefined> {

    static type = 'wallet-selected' as const;

    constructor (wallet: EIP6963ProviderDetail | undefined) {

        super(WalletSelectEvent.type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail: wallet,
        });
    }
}

export class WalletListElement extends HTMLElement {

    static tagName = 'wallet-list-element' as const;

    protected updateDone?: Promise<void>;

    protected _wallets: EIP6963ProviderDetail[] = [];

    protected _selected?: number;

    get wallets (): EIP6963ProviderDetail[] {

        return this._wallets;
    }

    set wallets (wallets: EIP6963ProviderDetail[]) {

        if (this._wallets === wallets) return;

        const selected = this.selected;
        const identifier = getEthereumProviderIdentifier(selected);

        this._wallets = wallets;
        this._selected = getEthereumProviderIndex(wallets, identifier);

        void this.scheduleUpdate();
    }

    get selected (): EIP6963ProviderDetail | undefined {

        return this._selected !== undefined
            ? this._wallets[this._selected]
            : undefined;
    }

    set selected (wallet: EIP6963ProviderDetail | undefined) {

        const identifier = getEthereumProviderIdentifier(wallet);

        const index = getEthereumProviderIndex(this._wallets, identifier, true);

        if (index === this._selected) return;

        this._selected = index;

        void this.scheduleUpdate();
    }

    connectedCallback (): void {

        void this.scheduleUpdate();
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

        this.querySelectorAll('.list-item').forEach(item => {

            item.addEventListener('click', () => {

                const index = parseInt(item.getAttribute('data-index') ?? '0');

                this.selectWallet(index);
            });
        });
    }

    protected selectWallet (index: number): void {

        this._selected = index;

        void this.scheduleUpdate();

        this.dispatchEvent(new WalletSelectEvent(this.selected));
    }
}

customElements.define(WalletListElement.tagName, WalletListElement);

declare global {

    interface HTMLElementTagNameMap {
        [WalletListElement.tagName]: WalletListElement;
    }

    interface HTMLElementEventMap {
        [WalletSelectEvent.type]: WalletSelectEvent;
    }
}
