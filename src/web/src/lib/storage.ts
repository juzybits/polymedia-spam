const storageKey = "polymedia.spam";

export type Wallet = {
    address: string;
    secretKey: string;
};

export function loadWallet(): Wallet|null {
    const dataRaw = localStorage.getItem(storageKey);
    if (!dataRaw) {
        return null;
    }
    const data = JSON.parse(dataRaw) as Wallet;
    return data;
}

export function saveWallet(wallet: Wallet|null): void {
    if (wallet) {
        localStorage.setItem(storageKey, JSON.stringify(wallet));
    } else {
        localStorage.removeItem(storageKey);
    }
}
