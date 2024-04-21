import { SuiClient, SuiObjectResponse, SuiTransactionBlockResponse } from "@mysten/sui.js/client";
import { Signer } from "@mysten/sui.js/cryptography";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import {
    NetworkName,
    convertBigIntToNumber,
    devInspectAndGetResults,
    getSuiObjectResponseFields,
} from "@polymedia/suits";
import { SPAM_IDS } from "./config";
import {
    claim_user_counter,
    destroy_user_counter,
    increment_user_counter,
    new_user_counter,
    register_user_counter,
    stats,
} from "./package";
import { UserCounter, UserData } from "./types";

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
        // fetch user counters
        const StructType = `${this.packageId}::spam::UserCounter`;
        const pageObjResp = await this.suiClient.getOwnedObjects({
            owner: this.signer.toSuiAddress(),
            cursor: null, // TODO handle pagination (unlikely to ever be needed)
            options: { showContent: true },
            filter: { StructType },
        });
        return pageObjResp.data.map(objResp => parseUserCounter(objResp));
    }

    public async fetchUserData(
    ): Promise<UserData>
    {
        // fetch user balances
        const balanceSui = await this.suiClient.getBalance({
            owner: this.signer.toSuiAddress(),
        });
        const balanceSpam = await this.suiClient.getBalance({
            owner: this.signer.toSuiAddress(),
            coinType: `${this.packageId}::spam::SPAM`,
        });
        const balances: UserData["balances"] = {
            spam: convertBigIntToNumber(BigInt(balanceSpam.totalBalance), 0),
            sui: convertBigIntToNumber(BigInt(balanceSui.totalBalance), 9),
        };

        // fetch user counters
        const userCountersArray = await this.fetchUserCounters();

        // fetch Sui epoch
        const suiState = await this.suiClient.getLatestSuiSystemState();
        const currEpoch = Number(suiState.epoch);

        // categorize user counters
        const counters: UserData["counters"] = {
            current: null,
            register: null,
            claim: [],
            delete: [],
        };
        for (const counter of userCountersArray) {
            if (counter.epoch === currEpoch) {
                if (!counters.current) {
                    counters.current = counter;
                } else {
                    // delete counter with lower tx_count
                    if (counter.tx_count > counters.current.tx_count) {
                        counters.delete.push(counters.current);
                        counters.current = counter;
                    } else {
                        counters.delete.push(counter);
                    }
                }
            }
            else if (counter.epoch == currEpoch - 1) {
                if (!counters.register) {
                    counters.register = counter;
                } else if (counter.registered) {
                    // delete unregistered counter
                    counters.delete.push(counters.register);
                    counters.register = counter;
                } else {
                    // delete counter with lower tx_count
                    if (counter.tx_count > counters.register.tx_count) {
                        counters.delete.push(counters.register);
                        counters.register = counter;
                    } else {
                        counters.delete.push(counter);
                    }
                }
            }
            else if (counter.epoch <= currEpoch - 2) {
                if (counter.registered) {
                    counters.claim.push(counter);
                } else {
                    // delete unclaimable counters
                    counters.delete.push(counter);
                }
            }
            else {
                throw new Error("UserCounter.epoch is newer than network epoch");
            }
        }

        // assemble and return UserData
        return {
            epoch: currEpoch,
            balances,
            counters,
        };
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

    public async getStats(
        epochs: number[],
    ): Promise<unknown>
    {
        const txb = new TransactionBlock();
        stats(txb, this.packageId, this.directorId, epochs);
        const res = await devInspectAndGetResults(this.suiClient, txb);

        return res[0].returnValues;
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
