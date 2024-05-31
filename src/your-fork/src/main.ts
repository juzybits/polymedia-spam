// Demonstrates using the SDK to build Node.js CLI tools for SPAM.

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SPAM_IDS, SpamClient } from "@polymedia/spam-sdk";
import { shortenSuiAddress } from "@polymedia/suitcase-core";

async function main()
{
    console.log("Mainnet package ID:", shortenSuiAddress(SPAM_IDS.mainnet.packageId));

    const spamClient = new SpamClient(
        new Ed25519Keypair(),
        "mainnet",
        "https://fullnode.mainnet.sui.io:443"
    );
    const stats = await spamClient.fetchStatsForRecentEpochs(3);

    console.log("Stats:");
    console.log(stats);
}

void main();
