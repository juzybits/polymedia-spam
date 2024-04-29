import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { Signer } from "@mysten/sui.js/cryptography";
import { NetworkName } from "@polymedia/suits";
import { SpamClient } from "./SpamClient";

export type SpamClientWithStats = {
    spamClient: SpamClient;
    active: boolean;
};

export class SpamClientRotator
{
    private spamClients: SpamClientWithStats[];
    private activeCount: number;
    private activeIndex: number;

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
                this.activeIndex = nextIndex;
                return this.getSpamClient();
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
    private getRandomInt(min: number, max: number): number {
        const minCeil = Math.ceil(min);
        const maxFloor = Math.floor(max);
        return Math.floor(Math.random() * (maxFloor - minCeil) + minCeil);
      }
}

export const RPC_ENDPOINTS: Record<NetworkName, string[]> = {
    "mainnet": [
        getFullnodeUrl("mainnet"),
    ],
    "testnet": [
        getFullnodeUrl("testnet"),
        "https://testnet.suiet.app",
        "https://rpc-testnet.suiscan.xyz",
        "https://sui-testnet-endpoint.blockvision.org",
        // "https://sui-testnet.public.blastapi.io",       // Slow to sync: "ObjectNotFound" / "Object is not available for consumption"
        "https://sui-testnet.nodeinfra.com",
        "https://testnet.sui.rpcpool.com",
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
