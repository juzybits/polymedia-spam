import { NetworkName } from "@polymedia/suits";

export type NetworkConfig = {
    packageId: string;
    directorId: string;
};

export const SPAM_IDS: Record<NetworkName, NetworkConfig> = {
    mainnet: {
        packageId: "",
        directorId: "",
    },
    testnet: {
        packageId: "",
        directorId: "",
    },
    devnet: {
        packageId: "",
        directorId: "",
    },
    localnet: {
        packageId: "0x0ccb88a710cd3277e77fed88fd85d3e90c063237c71f5f50148ce88e30c1b150",
        directorId: "0xbef2531fc5dbb4ac93cfc1a4c67ed8c1982da8b4ae6803b85137c7d5d9f40dcc",
    },
};
