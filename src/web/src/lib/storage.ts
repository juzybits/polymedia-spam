import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { RPC_ENDPOINTS } from "@polymedia/spam-sdk";
import { NetworkName, validateAndNormalizeAddress } from "@polymedia/suitcase-core";

/* Key pair */

const keySecretKey = "spam.secretKey";

export function loadKeypairFromStorage(): Ed25519Keypair {
    const secretKey = localStorage.getItem(keySecretKey);
    let pair: Ed25519Keypair;
    if (!secretKey) {
        pair = new Ed25519Keypair();
        saveKeypairToStorage(pair);
    } else {
        pair = pairFromSecretKey(secretKey);
    }
    return pair;
}

export function saveKeypairToStorage(pair: Ed25519Keypair): void {
    localStorage.setItem(keySecretKey, pair.getSecretKey());
}

export function pairFromSecretKey(secretKey: string): Ed25519Keypair {
    const parsedPair = decodeSuiPrivateKey(secretKey);
    return Ed25519Keypair.fromSecretKey(parsedPair.secretKey);
}

/* RPC URLs */

const keyRpcUrlsBaseKey = "spam.rpcUrls.";

export type RpcUrl = {
    url: string;
    enabled: boolean;
};

export function loadRpcUrlsFromStorage(network: NetworkName): RpcUrl[] {
    const defaultRpcs = getDefaultRpcUrls(network);
    const storedRpcsJson = localStorage.getItem(keyRpcUrlsBaseKey + network);
    let rpcUrls: RpcUrl[];
    if (!storedRpcsJson) {
        rpcUrls = defaultRpcs;
    } else {
        const storedRpcs = JSON.parse(storedRpcsJson) as RpcUrl[];
        rpcUrls = defaultRpcs.map(defRpc => {
            const storedRpc = storedRpcs.find(storRpc => storRpc.url === defRpc.url);
            return { url: defRpc.url, enabled: storedRpc ? storedRpc.enabled : true };
        });
    }
    saveRpcUrlsToStorage(network, rpcUrls);
    return rpcUrls;
}

export function saveRpcUrlsToStorage(network: string, rpcUrls: RpcUrl[]): void {
    localStorage.setItem(keyRpcUrlsBaseKey + network, JSON.stringify(rpcUrls));
}

function getDefaultRpcUrls(network: NetworkName): RpcUrl[] {
    return RPC_ENDPOINTS[network].map(url => {
        return { url, enabled: true };
    });
}

/* Claim address */

const claimAddressKey = "spam.claimAddress";

export function loadClaimAddressFromStorage(): string|undefined {
    const claimAddress = localStorage.getItem(claimAddressKey);
    if (!claimAddress) {
        return undefined;
    }
    const cleanAddress = validateAndNormalizeAddress(claimAddress);
    if (!cleanAddress) {
        return undefined;
    }
    return cleanAddress;
}

export function saveClaimAddressToStorage(claimAddress: string): void {
    const cleanAddress = validateAndNormalizeAddress(claimAddress);
    if (!cleanAddress) {
        throw Error(`Invalid claim address: ${claimAddress}`);
    }
    localStorage.setItem(claimAddressKey, cleanAddress);
}

/* Disclaimer */

const disclaimerAcceptedKey = "spam.disclaimerAccepted";

export function loadDisclaimerAcceptedFromStorage(): boolean {
    const accepted = localStorage.getItem(disclaimerAcceptedKey);
    return accepted === "yes";
}

export function saveDisclaimerAcceptedToStorage(): void {
    localStorage.setItem(disclaimerAcceptedKey, "yes");
}
