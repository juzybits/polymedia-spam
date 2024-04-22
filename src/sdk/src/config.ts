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
        packageId: "0xa173b385dba66af2b957a7907ea659a9a5e263f897a491addf2cc9e8001c6f72",
        directorId: "0x185767a8853d5dfac4fbab7e0d675468be77110d51d2dfd3b4c9fffd69c40360",
    },
};

export const SPAM_DECIMALS = 0;
export const SUI_DECIMALS = 9;
