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
        packageId: "0x320916971bb52f62fb15fac3b9b4ce2e33de1d97cff44ff42cca2e581b3377fe",
        directorId: "0x0c023f8bbafa2d15a2292b0797bc6f095b63a27b77919198c928e4f66a2b7315",
    },
};
