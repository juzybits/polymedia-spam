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
        packageId: "0x666e98440bcc804242d75450a99196bc80685f061e8f7a241493d04f4d899e03",
        directorId: "0xf93ee46934859c0dc1c9e0ff3dddfaa65c5cd32040090ba741db787c1dd97bbd",
    },
};

export const SPAM_DECIMALS = 0;
export const SUI_DECIMALS = 9;
