import { SuiClient, SuiObjectResponse, SuiTransactionBlockResponse } from "@mysten/sui.js/client";
import { Signer } from "@mysten/sui.js/cryptography";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { NetworkName, getSuiObjectResponseFields } from "@polymedia/suits";
import { SPAM_IDS } from "./config";
import { new_user_counter } from "./package";
import { UserCounter } from "./types";

export class SpamClient
{
    private signer: Signer;
    private suiClient: SuiClient;
    private packageId: string;
    // private directorId: string;

    constructor(
        keypair: Signer,
        suiClient: SuiClient,
        network: NetworkName,
    ) {
        const spamIds = SPAM_IDS[network];
        this.signer = keypair;
        this.suiClient = suiClient,
        this.packageId = spamIds.packageId;
        // this.directorId = spamIds.directorId;
    }

    public async fetchUserCounters(
        owner: string,
    ): Promise<UserCounter[]>
    {
        const StructType = `${this.packageId}::spam::UserCounter`;
        const pageObjResp = await this.suiClient.getOwnedObjects({
            owner,
            cursor: null, // TODO handle pagination
            options: { showContent: true },
            filter: { StructType },
        });
        return pageObjResp.data.map(objResp => parseUserCounter(objResp));
    }

    public async newUserCounter(
    ): Promise<SuiTransactionBlockResponse>
    {
        const txb = new TransactionBlock();
        txb.setSender(this.signer.toSuiAddress());

        new_user_counter(txb, this.packageId);

        const { bytes, signature } = await txb.sign({
            signer: this.signer,
            client: this.suiClient,
        });

        return await this.suiClient.executeTransactionBlock({
            signature,
            transactionBlock: bytes,
            options: { showEffects: true },
        });
    }
}

/* eslint-disable */
function parseUserCounter(
    resp: SuiObjectResponse,
): UserCounter {
    const fields = getSuiObjectResponseFields(resp);
    return {
        id: fields.id.id,
        epoch: Number(fields.epoch),
        tx_count: Number(fields.tx_count),
    };
}
/* eslint-enable */
