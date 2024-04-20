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
import { UserCounter, UserCounters } from "./types";

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
    ): Promise<UserCounters>
    {
        // fetch user counters
        const StructType = `${this.packageId}::spam::UserCounter`;
        const pageObjResp = await this.suiClient.getOwnedObjects({
            owner: this.signer.toSuiAddress(),
            cursor: null, // TODO handle pagination
            options: { showContent: true },
            filter: { StructType },
        });
        const userCountersArray = pageObjResp.data.map(objResp => parseUserCounter(objResp));

        // fetch Sui epoch
        const suiState = await this.suiClient.getLatestSuiSystemState();
        const currEpoch = Number(suiState.epoch);

        // categorize user counters
        const userCounters: UserCounters =  {
            current: null,
            register: null,
            claim: [],
            delete: [], // TODO
        };
        for (const counter of userCountersArray) {
            if (counter.epoch === currEpoch) {
                if (!userCounters.current) {
                    userCounters.current = counter;
                } else {
                    // delete counter with lower tx_count
                    if (counter.tx_count > userCounters.current.tx_count) {
                        userCounters.delete.push(userCounters.current);
                        userCounters.current = counter;
                    } else {
                        userCounters.delete.push(counter);
                    }
                }
            }
            else if (counter.epoch == currEpoch - 1) {
                if (!userCounters.register) {
                    userCounters.register = counter;
                } else if (counter.registered) {
                    // delete unregistered counter
                    userCounters.delete.push(userCounters.register);
                    userCounters.register = counter;
                } else {
                    // delete counter with lower tx_count
                    if (counter.tx_count > userCounters.register.tx_count) {
                        userCounters.delete.push(userCounters.register);
                        userCounters.register = counter;
                    } else {
                        userCounters.delete.push(counter);
                    }
                }
            }
            else if (counter.epoch <= currEpoch - 2) {
                if (counter.registered) {
                    userCounters.claim.push(counter);
                } else {
                    // delete unclaimable counters
                    userCounters.delete.push(counter);
                }
            }
            else {
                throw new Error("UserCounter.epoch is newer than network epoch");
            }
        }

        return userCounters;
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

    public async claimUserCounters(
        userCounterIds: string[],
    ): Promise<SuiTransactionBlockResponse>
    {
        const txb = new TransactionBlock();
        for (const counterId of userCounterIds) {
            const [coin] = claim_user_counter(txb, this.packageId, this.directorId, counterId);
            txb.transferObjects([coin], this.signer.toSuiAddress());
        }
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
