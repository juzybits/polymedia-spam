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
        packageId: "0xd5a35981727177ea2027459d57d20bf928315a06280cae71e45459f0d0f4b78e",
        directorId: "0x2086475493f1bdad6b9c41d8b4f043e63eeda61e452a0272b6de8fae4943ebd7",
    },
};

export const SPAM_DECIMALS = 4;
export const SUI_DECIMALS = 9;
