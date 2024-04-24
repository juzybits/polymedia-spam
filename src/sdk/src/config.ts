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
        packageId: "0x48815f75e8a5389f412dcb6b95eb49ac082f6043f4d4c2437355913830335ccf",
        directorId: "0x00268a2806153cf83e50498b58bbf19d470b09a03a7801953a12a631acc35f3a",
    },
};

export const SPAM_DECIMALS = 4;
export const SUI_DECIMALS = 9;
