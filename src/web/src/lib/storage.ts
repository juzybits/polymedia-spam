import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";

const storageKey = "polymedia.secretKey";

export function loadKeypairFromStorage(): Ed25519Keypair {
    const secretKey = localStorage.getItem(storageKey);
    let pair: Ed25519Keypair;
    if (!secretKey) {
        pair = new Ed25519Keypair();
        saveKeypairToStorage(pair);
    } else {
        const parsedPair = decodeSuiPrivateKey(secretKey);
        pair = Ed25519Keypair.fromSecretKey(parsedPair.secretKey);
    }
    return pair;
}

export function saveKeypairToStorage(pair: Ed25519Keypair): void {
    localStorage.setItem(storageKey, pair.getSecretKey());
}
