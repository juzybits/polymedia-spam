import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { RPC_ENDPOINTS } from "@polymedia/spam-sdk";
import { NetworkName } from "@polymedia/suits";

const storageKey = "spam.secretKey";

export function loadKeypairFromStorage(): Ed25519Keypair {
    const secretKey = localStorage.getItem(storageKey);
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
    localStorage.setItem(storageKey, pair.getSecretKey());
}

export function loadRpcEndpointsFromStorage(network: NetworkName): string[] { // TODO
    return RPC_ENDPOINTS[network];
}

export function pairFromSecretKey(secretKey: string): Ed25519Keypair {
    const parsedPair = decodeSuiPrivateKey(secretKey);
    return Ed25519Keypair.fromSecretKey(parsedPair.secretKey);
}
