import {
    SuiClient,
    SuiObjectRef,
    SuiObjectResponse,
    SuiTransactionBlockResponse,
} from "@mysten/sui.js/client";
import { Signer } from "@mysten/sui.js/cryptography";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import {
    NetworkName,
    devInspectAndGetResults,
    getSuiObjectResponseFields,
} from "@polymedia/suits";
import { SPAM_IDS, SPAM_MODULE } from "./config";
import * as pkg from "./package";
import { BcsStats, Stats, UserCounter, UserCounters } from "./types";

export class SpamClient
{
    public readonly signer: Signer;
    public readonly network: NetworkName;
    public readonly rpcUrl: string;
    public readonly suiClient: SuiClient;
    public readonly packageId: string;
    public readonly directorId: string;

    constructor(
        keypair: Signer,
        network: NetworkName,
        rpcUrl: string,
    ) {
        this.signer = keypair;
        this.network = network;
        this.rpcUrl = rpcUrl;
        this.suiClient = new SuiClient({ url: rpcUrl }),
        this.packageId = SPAM_IDS[network].packageId;
        this.directorId = SPAM_IDS[network].directorId;
    }

    /* Data fetching */

    public async fetchUserCounters(
    ): Promise<UserCounter[]>
    {
        const StructType = `${this.packageId}::${SPAM_MODULE}::UserCounter`;
        const pageObjResp = await this.suiClient.getOwnedObjects({
            owner: this.signer.toSuiAddress(),
            cursor: null, // doesn't handle pagination, but it's unlikely that it will ever be needed
            options: { showContent: true },
            filter: { StructType },
        });
        return pageObjResp.data.map(objResp => this.parseUserCounter(objResp));
    }

    public async fetchUserCountersAndClassify()
    {
        // fetch user counters
        const userCountersArray = await this.fetchUserCounters();

        // fetch Sui epoch
        const suiState = await this.suiClient.getLatestSuiSystemState();
        const currEpoch = Number(suiState.epoch);

        // categorize user counters
        const counters: UserCounters = {
            epoch: currEpoch,
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

        // Dev-only
        // if (!counters.current) {
        //     counters.current = {
        //         id: "0x1111111111111111",
        //         ref: {
        //             objectId: "0x1111111111111111",
        //             version: "111",
        //             digest: "aaaaaaaaa",
        //         },
        //         epoch: currEpoch,
        //         tx_count: 111,
        //         registered: false,
        //     };
        // }
        // if (!counters.register) {
        //     counters.register = {
        //         id: "0x2222222222222222",
        //         ref: {
        //             objectId: "0x2222222222222222",
        //             version: "222",
        //             digest: "zzzzzzzzz",
        //         },
        //         epoch: currEpoch -1,
        //         tx_count: 222,
        //         registered: true,
        //     };
        // }

        return counters;
    }

    /* Package functions */

    public async newUserCounter(
    ): Promise<SuiTransactionBlockResponse>
    {
        const txb = new TransactionBlock();
        pkg.new_user_counter(txb, this.packageId);
        return this.signAndExecute(txb);
    }

    public async incrementUserCounter(
        userCounterRef: SuiObjectRef,
    ): Promise<SuiTransactionBlockResponse>
    {
        const txb = new TransactionBlock();
        pkg.increment_user_counter(txb, this.packageId, userCounterRef);
        return this.signAndExecute(txb);
    }

    public async destroyUserCounters(
        userCounterIds: string[],
    ): Promise<SuiTransactionBlockResponse>
    {
        const txb = new TransactionBlock();
        for (const counterId of userCounterIds) {
            pkg.destroy_user_counter(txb, this.packageId, counterId);
        }
        return this.signAndExecute(txb);
    }

    public async registerUserCounter(
        userCounterId: string,
    ): Promise<SuiTransactionBlockResponse>
    {
        const txb = new TransactionBlock();
        pkg.register_user_counter(txb, this.packageId, this.directorId, userCounterId);
        return this.signAndExecute(txb);
    }

    public async claimUserCounters(
        userCounterIds: string[],
    ): Promise<SuiTransactionBlockResponse>
    {
        const txb = new TransactionBlock();
        for (const counterId of userCounterIds) {
            const [coin] = pkg.claim_user_counter(txb, this.packageId, this.directorId, counterId);
            txb.transferObjects([coin], this.signer.toSuiAddress());
        }
        return this.signAndExecute(txb);
    }

    public async fetchStatsForSpecificEpochs(
        epochNumbers: number[],
    ): Promise<Stats>
    {
        const txb = new TransactionBlock();
        pkg.stats_for_specific_epochs(txb, this.packageId, this.directorId, epochNumbers);
        return this.deserializeStats(txb);
    }

    public async fetchStatsForRecentEpochs(
        epochCount: number,
    ): Promise<Stats>
    {
        const txb = new TransactionBlock();
        pkg.stats_for_recent_epochs(txb, this.packageId, this.directorId, epochCount);
        return this.deserializeStats(txb);
    }

    /* Helpers */

    private async deserializeStats(
        txb: TransactionBlock,
    ): Promise<Stats>
    {
        const blockResults = await devInspectAndGetResults(this.suiClient, txb);

        const txResults = blockResults[0];
        if (!txResults.returnValues?.length) {
            throw Error(`transaction didn't return any values: ${JSON.stringify(txResults, null, 2)}`);
        }

        const value = txResults.returnValues[0];
        const valueData = Uint8Array.from(value[0]);
        const valueDeserialized = BcsStats.parse(valueData);

        return valueDeserialized;
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
            requestType: "WaitForEffectsCert", // redundant because of showEffects, but just in case
        });
    }

    /* eslint-disable */
    private parseUserCounter(
        resp: SuiObjectResponse,
    ): UserCounter {
        const fields = getSuiObjectResponseFields(resp);
        const ref: SuiObjectRef = {
            objectId: resp.data!.objectId,
            version: resp.data!.version,
            digest: resp.data!.digest,
        };
        return {
            id: fields.id.id,
            ref,
            epoch: Number(fields.epoch),
            tx_count: Number(fields.tx_count),
            registered: Boolean(fields.registered),
        };
    }
    /* eslint-enable */
}
