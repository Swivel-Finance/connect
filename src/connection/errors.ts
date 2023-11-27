const NETWORKS: Record<number, string> = {
    1: 'mainnet',
    5: 'goerli',
    42161: 'arbitrum',
    421613: 'arbitrum goerli',
    421614: 'arbitrum sepolia',
    11155111: 'sepolia',
};

const formatNetwork = (chainId: number) => {

    const network = NETWORKS[chainId];

    return `${ network ? `name: ${ network }, ` : '' }chain: ${ chainId }`;
};

export const ERRORS = {
    WALLET_UNAVAILABLE: () => new Error(
        'No browser wallets detected. Please make sure you have a browser wallet installed and try again.',
    ),
    WALLET_UNSPECIFIED: () => new Error(
        'No browser wallet selected. Please select a browser wallet before connecting.',
    ),
    NETWORK_MISMATCH: (chainId: number) => new Error(
        `Wrong network. Please switch your wallet to the correct network (${ formatNetwork(chainId) }) and try again.`,
    ),
} as const;
