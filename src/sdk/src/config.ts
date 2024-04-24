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
        // LOL. Change SPAM_MODULE and SPAM_SYMBOL below for this to work.
        packageId: "0x7f564f428e939e938dbdccfcc658c78ab9c5b3a2fce912138bdeeca0702446ce",
        directorId: "0x4a3d63044b755a224fde81bbead66bd4faf6bb8a88f24dcd21e0b047d663dd67",
        // adminCapId: "0x2010974ce9ba8d6051f78b4e9e07ac4e043ca9df4d1ebd44a429a2d1f22a6f79",
        // upgradeCapId: "0x24f92c47ea6b9d33e2e61f5018e88f46a03cd0afe89144c2f75b52067bb0c695",
        // coinMetadataId: "0x27dc2fafa451725a085906a2eed0dc1375ca0e69eaa6760450d6293a01709294",
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

export const SPAM_MODULE = "lol";
export const SPAM_SYMBOL = "LOL";
export const SPAM_DECIMALS = 4;
export const SUI_DECIMALS = 9;
