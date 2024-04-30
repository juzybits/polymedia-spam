import { NetworkName } from "@polymedia/suits";

export type NetworkConfig = {
    packageId: string;
    directorId: string;
};

export const SPAM_IDS: Record<NetworkName, NetworkConfig> = {
    mainnet: {
        // LOL. Change SPAM_MODULE and SPAM_SYMBOL below for this to work.
        packageId: "0xb677216bb9992c1576c1bd009fbce2e6dc58f004b92d2650156ebb88e43a08e3",
        directorId: "0x6ae73b50ffe305118883a1259134ebb574a2793958cb2c1bec33b7db03a5017e",
    },
    testnet: {
        packageId: "0xee8c6eef6ccfec35841924540e84fa6fb066596862503dbeef190eef5eab198b",
        directorId: "0x8fc17669386e9f033069d138e83c0d66b34f77624924538563edeb73dfedf948",
    },
    devnet: {
        packageId: "0x6643583a9b194516985434f5479f3c3d7435cb09ca0a7c26ee472134140cf313",
        directorId: "0x549f43498c2337e8dec316b46748d089a37be11bf8e2ac63718e64069d41cea1",
    },
    localnet: {
        packageId: "",
        directorId: "",
    },
};

export const SPAM_MODULE = "spam";
export const SPAM_SYMBOL = "SPAM";
export const SPAM_DECIMALS = 4;
export const SUI_DECIMALS = 9;
