import { NetworkName } from "@polymedia/suitcase-core";

export type NetworkConfig = {
    packageId: string;
    directorId: string;
};

export const SPAM_IDS: Record<NetworkName, NetworkConfig> = {
    mainnet: {
        packageId: "0x30a644c3485ee9b604f52165668895092191fcaf5489a846afa7fc11cdb9b24a",
        directorId: "0x71d2211afbb63a83efc9050ded5c5bb7e58882b17d872e32e632a978ab7b5700",
    },
    testnet: {
        packageId: "0xb0783634bd4aeb2c97d3e707fce338c94d135d72e1cb701ca220b34f7b18b877",
        directorId: "0x6f0919d420bcfd5156534e864f0ec99ef8f1137ba59f44d4a39edca73e7ae464",
    },
    devnet: {
        packageId: "",
        directorId: "",
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
export const LAST_SPAM_EPOCH = 422;
