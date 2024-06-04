# connect
A flexible web3 connection service for swivel frontends and node scripting environments.

## Features
- Supports multiple browser wallet extensions through [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963)
- Supports browser wallets, rpc providers, and mocked providers

## Installation
```bash
npm install --save @swivel-finance/connect
```

## Usage
```ts
import { WalletService } from '@swivel-finance/connect';
import { BrowserConnectionProvider } from '@swivel-finance/connect/connection/providers/browser/provider.js';

// create a wallet service instance, passing a compatible connection provider
// you could pass an rpc provider or a mock provider here as well
const walletService = new WalletService({
    connectionProvider: new BrowserConnectionProvider({
        chainId: 1,
    }),
});

// obtain a connection object by calling connect on the wallet service
// the connection object contains the following properties:
//
// interface Connection {
//     network: Network;
//     account: Account;
//     provider: Provider;
//     signer: Signer;
// }
const connection = await walletService.connect();
```

See more examples in the [examples](./example) directory.
