import { SuiClient, SuiObjectResponse, SuiTransactionBlockResponse } from "@mysten/sui.js/client";
import { Signer } from "@mysten/sui.js/cryptography";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import {
    NetworkName,
    convertBigIntToNumber,
    devInspectAndGetResults,
    getSuiObjectResponseFields,
    shortenSuiAddress,
    sleep,
} from "@polymedia/suits";
import { SPAM_DECIMALS, SPAM_IDS, SUI_DECIMALS } from "./config";
import {
    claim_user_counter,
    destroy_user_counter,
    increment_user_counter,
    new_user_counter,
    register_user_counter,
    stats_for_recent_epochs,
    stats_for_specific_epochs,
} from "./package";
import { BcsStats, Stats, UserCounter, UserData } from "./types";
import { SpamError, parseSpamError } from "./errors";

export type SpamStatus = "stopped" | "running" | "stop requested";
export type SpamEventType = "debug" | "info" | "warn";
export type SpamEvent = {
    type: SpamEventType;
    msg: string;
};
export type SpamEventHandler = (event: SpamEvent) => void;

export class SpamClient
{
    public signer: Signer;
    public network: NetworkName;
    public rpcUrl: string;
    public suiClient: SuiClient;
    public packageId: string;
    public directorId: string;
    public status: SpamStatus;
    public userData: UserData|null;
    public onEvent: SpamEventHandler;

    constructor(
        keypair: Signer,
        network: NetworkName,
        rpcUrl: string,
        onEvent: SpamEventHandler,
    ) {
        this.signer = keypair;
        this.network = network;
        this.rpcUrl = rpcUrl;
        this.suiClient = new SuiClient({ url: rpcUrl }),
        this.packageId = SPAM_IDS[network].packageId;
        this.directorId = SPAM_IDS[network].directorId;
        this.status = "stopped";
        this.userData = null;
        this.onEvent = onEvent;
    }

    /* Spam functions */

    public stop() {
        this.status = "stop requested";
    }

    public async start()
    {
        if (this.status == "running") {
            this.onEvent({ type: "warn", msg: "Already running" });
            return;
        }

        if (this.status === "stop requested") {
            this.status = "stopped";
            this.onEvent({ type: "info", msg: "stopped" });
            return;
        }

        this.status = "running";

        try {
            if (this.userData === null) { // 1st run
                this.onEvent({ type: "info", msg: "loading user data" });
                this.userData = await this.fetchUserData(); // Reassignment not needed
            }

            const counters = this.userData.counters;

            if (counters.register !== null && !counters.register.registered) {
                this.onEvent({ type: "info", msg: "registering counter: " + shortenSuiAddress(counters.register.id) });
                const resp = await this.registerUserCounter(counters.register.id);
                counters.register.registered = true;
                this.onEvent({
                    type: "debug",
                    msg: "registerUserCounter resp: " + JSON.stringify(resp, null, 2),
                });
            }

            if (counters.claim.length > 0) {
                this.onEvent({ type: "info", msg: "claiming counters: " + counters.claim.map(c => shortenSuiAddress(c.id)).join(", ") });
                const counterIds = counters.claim.map(counter => counter.id);
                const resp = await this.claimUserCounters(counterIds);
                counters.claim = [];
                this.onEvent({
                    type: "debug",
                    msg: "destroyUserCounters resp: " + JSON.stringify(resp, null, 2),
                });
            }

            if (counters.delete.length > 0) {
                this.onEvent({ type: "info", msg: "deleting counters: " + counters.delete.map(c => shortenSuiAddress(c.id)).join(", ") });
                const counterIds = counters.delete.map(counter => counter.id);
                const resp = await this.destroyUserCounters(counterIds);
                counters.delete = [];
                this.onEvent({ type: "debug", msg: "destroyUserCounters resp: " + JSON.stringify(resp, null, 2) });
            }

            if (counters.current === null) {
                this.onEvent({ type: "info", msg: "creating counter" });
                const resp = await this.newUserCounter();
                this.userData = null; // force a re-fetch // TODO: this happens twice on epoch change (see catch() below)
                this.onEvent({ type: "debug", msg: "newUserCounter resp: " + JSON.stringify(resp, null, 2) });
            } else {
                this.network == "localnet" && await sleep(333); // simulate latency
                const resp = await this.incrementUserCounter(counters.current.id);
                this.onEvent({ type: "debug", msg: "incrementUserCounter resp: " + JSON.stringify(resp, null, 2) });
            }
        }
        catch (err) {
            const errStr = String(err);
            const errCode = parseSpamError(errStr);
            if (errCode === SpamError.EWrongEpoch) {
                // Expected error: when the epoch changes, the counter is no longer incrementable
                this.userData = null; // force a re-fetch
                this.start();
                this.onEvent({ type: "info", msg: "epoch change"});
            }
            else {
                // Unexpected error // TODO rotate RPC etc
                this.onEvent({ type: "warn", msg: String(err) });
            }
        }
        finally {
            if (this.status === "running") {
                this.status = "stopped";
            }
            this.start();
        }
    }

    /* Sui RPC functions */

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
        return pageObjResp.data.map(objResp => this.parseUserCounter(objResp));
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
            spam: convertBigIntToNumber(BigInt(balanceSpam.totalBalance), SPAM_DECIMALS),
            sui: convertBigIntToNumber(BigInt(balanceSui.totalBalance), SUI_DECIMALS),
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
        this.userData = {
            epoch: currEpoch,
            balances,
            counters,
        };
        return this.userData;
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

    public async fetchStatsForSpecificEpochs(
        epochNumbers: number[],
    ): Promise<Stats>
    {
        const txb = new TransactionBlock();
        stats_for_specific_epochs(txb, this.packageId, this.directorId, epochNumbers);
        return this.deserializeStats(txb);
    }

    public async fetchStatsForRecentEpochs(
        epochCount: number,
    ): Promise<Stats>
    {
        const txb = new TransactionBlock();
        stats_for_recent_epochs(txb, this.packageId, this.directorId, epochCount);
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
        });
    }

    /* eslint-disable */
    private parseUserCounter(
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
}
