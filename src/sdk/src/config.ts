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
        packageId: "0xbf0ff9528f4714e55ea8c427d35f9cb0921f04190c91d0c45089b14437507fcf",
        directorId: "0x80c1195b1552866593fdfc4da741162f2c199cac157761e084b821dda835a7b0",
    },
};

export const SPAM_DECIMALS = 0;
export const SUI_DECIMALS = 9;
