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
        packageId: "0x095958cdce9aad10fcec38db90453a8c35e4851630c9a78b798c7783ea245e5b",
        directorId: "0x1e1001a61d496af9071772bb559e14041db378efe3d68746387c0ef2e07bc4f4",
    },
};

export const SPAM_DECIMALS = 4;
export const SUI_DECIMALS = 9;
