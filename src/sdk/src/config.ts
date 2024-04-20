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
        packageId: "0xbd6dfc64474bb6dab7ad8c2fbffef0208a41570e1f011da94dc0f7ee3a4c31a2",
        directorId: "0x0ac657f23ce68e9c92c1e6327a90aa57cd70d01ce165e5797dc05ab57944df5b",
    },
};
