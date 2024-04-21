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
        packageId: "0x5cec8df087d4b41e731905c585e2d16283b39f15637a09e363cf07b8818ac12a",
        directorId: "0x039df5a72cc0f69a632987b18778ec20e79825855655fe302a2820b80297b74b",
    },
};

export const SPAM_DECIMALS = 0;
export const SUI_DECIMALS = 9;
