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
        packageId: "0x14768e58af441f6bec4c9942b24ac179ed4594894402633f030c34b41dd5b411",
        directorId: "0x2eb2f3faee3ee72ce7b97f6ba210c02fb5b7d6f8ede509368c8cc23d842130bb",
    },
};
