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
        packageId: "0xaf641359ec481a39ed7b2dcb3165c99e158a0bac0143e9d33ef79199b0d27431",
        directorId: "0x9e86b5d93faf1ccf950ac0c6bebeaa313bc22c34e10a1899c8e6fd189f3adfdc",
    },
};
