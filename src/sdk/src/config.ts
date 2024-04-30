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
        // LOL. Change SPAM_MODULE and SPAM_SYMBOL below for this to work.
        packageId: "0x9d26aeba82a31aa1e322ce0d1c5f6cb79c7d6708a2ab2e7c3ad22350287cd093",
        directorId: "0xda93b051883818115bfc8edd74814acc3dbd6c53073393e9db31fc4a7226d8be",
    },
    devnet: {
        // LOL. Change SPAM_MODULE and SPAM_SYMBOL below for this to work.
        packageId: "0x4e826283a47fcbc3264b93b27708ec9d3ec603b3bf4f0a7bf593e900b15d392b",
        directorId: "0x10b48b8854980935bcc5d404497e7788d555c3f063c77b23e6a94edd0075c6cb",
    },
    localnet: {
        packageId: "0x48815f75e8a5389f412dcb6b95eb49ac082f6043f4d4c2437355913830335ccf",
        directorId: "0x00268a2806153cf83e50498b58bbf19d470b09a03a7801953a12a631acc35f3a",
    },
};

export const SPAM_MODULE = "lol";
export const SPAM_SYMBOL = "LOL";
export const SPAM_DECIMALS = 4;
export const SUI_DECIMALS = 9;
