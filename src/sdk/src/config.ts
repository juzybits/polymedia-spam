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
        packageId: "0x5452ac35f46a2b10c1ad45c8c5bb352ac2c38d5e2bf56469486d760b33dd4c7e",
        directorId: "0x0ef1d956ba03422e691d5c652f7069cef4c340a2a5e2df9af839bffe02f7f81c",
    },
};
