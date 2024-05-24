import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { Signer } from "@mysten/sui.js/cryptography";
import { NetworkName } from "@polymedia/suitcase-core";
import { SpamClient } from "./SpamClient.js";

export type SpamClientWithStats = {
    spamClient: SpamClient;
    active: boolean;
};

export class SpamClientRotator
{
    protected spamClients: SpamClientWithStats[];
    protected activeCount: number;
    protected activeIndex: number;

    constructor(
        keypair: Signer,
        network: NetworkName,
        rpcUrls: string[],
    ) {
        if (rpcUrls.length === 0) {
            throw new Error("rpcUrls can't be empty");
        }
        this.spamClients = [];
        for (const url of rpcUrls) {
            this.spamClients.push({
                spamClient: new SpamClient(keypair, network, url),
                active: true,
            });
        }
        this.activeCount = rpcUrls.length;
        this.activeIndex = this.getRandomInt(0, rpcUrls.length);
    }

    public nextSpamClient(): SpamClient {
        if (this.activeCount === 0) {
            throw new Error("No active SpamClients are available.");
        }
        if (this.activeCount === 1 && this.spamClients[this.activeIndex].active) {
            return this.getSpamClient();
        }

        const activeIndex = this.activeIndex;
        let nextIndex = this.activeIndex;
        do {
            nextIndex = (nextIndex + 1) % this.spamClients.length;
            if (this.spamClients[nextIndex].active) {
                const oldClient = this.getSpamClient();
                this.activeIndex = nextIndex;
                const newClient = this.getSpamClient();
                // Reuse gas and protocol config from previous SpamClient to avoid re-fetching
                newClient.setGasCoin(oldClient.getGasCoin());
                newClient.setGasPrice(oldClient.getGasPrice());
                newClient.setProtocolConfig(oldClient.getProtocolConfig());
                return newClient;
            }
        } while (nextIndex !== activeIndex);

        throw new Error("No active spam clients available.");
    }

    public getSpamClient(): SpamClient {
        return this.spamClients[this.activeIndex].spamClient;
    }

    public getSuiClient(): SuiClient  {
        return this.spamClients[this.activeIndex].spamClient.suiClient;
    }

    // The minimum is inclusive and the maximum is exclusive
    protected getRandomInt(min: number, max: number): number {
        const minCeil = Math.ceil(min);
        const maxFloor = Math.floor(max);
        return Math.floor(Math.random() * (maxFloor - minCeil) + minCeil);
      }
}

export const RPC_ENDPOINTS: Record<NetworkName, string[]> = {
    "mainnet": [
        getFullnodeUrl("mainnet"),
        "https://mainnet.suiet.app",
        "https://sui-mainnet-us-2.cosmostation.io",
        "https://sui-mainnet-endpoint.blockvision.org",
        "https://sui-mainnet.public.blastapi.io",
        "https://sui-mainnet-rpc.allthatnode.com",
        "https://sui-mainnet-eu-4.cosmostation.io",
        "https://sui1mainnet-rpc.chainode.tech",
        "https://rpc-mainnet.suiscan.xyz",
        "https://sui-mainnet-ca-2.cosmostation.io",
        // "https://mainnet.sui.rpcpool.com",               // 429 (Too Many Requests)
        // "https://sui.publicnode.com",                    // CORS error
        // "https://sui-mainnet.nodeinfra.com",             // CORS error
        // "https://sui-mainnet-rpc.bartestnet.com",        // CORS error
    ],
    "testnet": [
        getFullnodeUrl("testnet"),
        "https://testnet.suiet.app",
        "https://sui-testnet-endpoint.blockvision.org",
        "https://sui-testnet.nodeinfra.com",
        "https://testnet.sui.rpcpool.com",
        // "https://rpc-testnet.suiscan.xyz",              // Slow to sync (ObjectNotFound error)
        // "https://sui-testnet.public.blastapi.io",       // Slow to sync: "ObjectNotFound" / "Object is not available for consumption"
    ],
    "devnet": [
        getFullnodeUrl("devnet"),
        // "https://devnet.suiet.app",
    ],
    "localnet": [
        // to simulate multiple RPC endpoints locally
        getFullnodeUrl("localnet") + "?localnet-1",
        getFullnodeUrl("localnet") + "?localnet-2",
        getFullnodeUrl("localnet") + "?localnet-3",
        getFullnodeUrl("localnet") + "?localnet-4",
        getFullnodeUrl("localnet") + "?localnet-5",
    ],
};
