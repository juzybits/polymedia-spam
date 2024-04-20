import { SuiClient, SuiObjectResponse, SuiTransactionBlockResponse } from "@mysten/sui.js/client";
import { Signer } from "@mysten/sui.js/cryptography";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { NetworkName, getSuiObjectResponseFields } from "@polymedia/suits";
import { SPAM_IDS } from "./config";
import {
    claim_user_counter,
    destroy_user_counter,
    increment_user_counter,
    new_user_counter,
    register_user_counter,
} from "./package";
import { UserCounter } from "./types";

export class SpamClient
{
    private signer: Signer;
    private suiClient: SuiClient;
    private packageId: string;
    private directorId: string;

    constructor(
        keypair: Signer,
        suiClient: SuiClient,
        network: NetworkName,
    ) {
        const spamIds = SPAM_IDS[network];
        this.signer = keypair;
        this.suiClient = suiClient,
        this.packageId = spamIds.packageId;
        this.directorId = spamIds.directorId;
    }

    public async fetchUserCounters(
    ): Promise<UserCounter[]>
    {
        const StructType = `${this.packageId}::spam::UserCounter`;
        const pageObjResp = await this.suiClient.getOwnedObjects({
            owner: this.signer.toSuiAddress(),
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
        new_user_counter(txb, this.packageId);
        return this.signAndExecute(txb);
    }

    public async incrementUserCounter(
        userCounterId: string,
    ): Promise<SuiTransactionBlockResponse>
    {
        const txb = new TransactionBlock();
        increment_user_counter(txb, this.packageId, userCounterId);
        return this.signAndExecute(txb);
    }

    public async destroyUserCounters(
        userCounterIds: string[],
    ): Promise<SuiTransactionBlockResponse>
    {
        const txb = new TransactionBlock();
        for (const counterId of userCounterIds) {
            destroy_user_counter(txb, this.packageId, counterId);
        }
        return this.signAndExecute(txb);
    }

    public async registerUserCounter(
        userCounterId: string,
    ): Promise<SuiTransactionBlockResponse>
    {
        const txb = new TransactionBlock();
        register_user_counter(txb, this.packageId, this.directorId, userCounterId);
        return this.signAndExecute(txb);
    }

    public async claimUserCounter(
        userCounterId: string,
    ): Promise<SuiTransactionBlockResponse>
    {
        const txb = new TransactionBlock();
        claim_user_counter(txb, this.packageId, this.directorId, userCounterId);
        return this.signAndExecute(txb);
    }

    private async signAndExecute(
        txb: TransactionBlock,
    ): Promise<SuiTransactionBlockResponse>
    {
        txb.setSender(this.signer.toSuiAddress());

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
        registered: Boolean(fields.registered),
    };
}
/* eslint-enable */
