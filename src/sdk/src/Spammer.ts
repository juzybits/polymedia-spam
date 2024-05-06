import { SuiClient, SuiObjectRef } from "@mysten/sui.js/client";
import { Signer } from "@mysten/sui.js/cryptography";
import { NetworkName, shortenSuiAddress, sleep } from "@polymedia/suits";
import { SpamClient } from "./SpamClient.js";
import { SpamClientRotator } from "./SpamClientRotator.js";
import { SpamError, parseSpamError } from "./errors.js";
import { UserCounters, emptyUserCounters } from "./types.js";

export type SpamStatus = "stopped" | "running" | "stopping";

export type SpamEvent = {
    type: "debug" | "info" | "warn" | "error";
    msg: string;
};

export type SpamEventHandler = (event: SpamEvent) => void;

const TXS_UNTIL_ROTATE = 50;
const SLEEP_MS_AFTER_RPC_CHANGE = 1000;
const SLEEP_MS_AFTER_OBJECT_NOT_READY = 1000;
const SLEEP_MS_AFTER_EPOCH_CHANGE = 45000;
const SLEEP_MS_AFTER_NETWORK_ERROR = 45000;
const SLEEP_MS_AFTER_UNEXPECTED_ERROR = 45000;

export class Spammer
{
    public status: SpamStatus;
    public userCounters: UserCounters;
    private requestRefetch: boolean;
    private lastTxDigest: string|null;
    private eventHandler: SpamEventHandler|undefined;
    private txsSinceRotate: number;
    private readonly rotator: SpamClientRotator;
    private simulateLatencyOnLocalnet: () => Promise<void>;

    constructor(
        keypair: Signer,
        network: NetworkName,
        rpcUrls: string[],
        eventHandler?: SpamEventHandler,
    ) {
        this.status = "stopped";
        this.userCounters = emptyUserCounters();
        this.requestRefetch = true; // so when it starts it pulls fresh data
        this.lastTxDigest = null;
        this.eventHandler = eventHandler;
        this.txsSinceRotate = 0;
        this.rotator = new SpamClientRotator(keypair, network, rpcUrls);
        this.simulateLatencyOnLocalnet = async () => {
            if (this.getSpamClient().network === "localnet") {
                await sleep(500);
            }
        };
    }

    /* Events */

    public setEventHandler(handler: SpamEventHandler) {
        this.eventHandler = handler;
    }

    public removeEventHandler() {
        this.eventHandler = undefined;
    }

    private event(event: SpamEvent) {
        this.eventHandler && this.eventHandler(event);
    }

    /* Client accessors */

    public getSpamClient(): SpamClient {
        return this.rotator.getSpamClient();
    }

    public getSuiClient(): SuiClient  {
        return this.rotator.getSuiClient();
    }

    /* Start and stop */

    public start(loop: boolean) {
        if (this.status === "stopped") {
            this.status = "running";
            const msg = loop ? "Starting" : "Processing counters";
            this.event({ type: "info", msg});
            this.spam(loop);
        }
    }

    public stop() {
        if (this.status === "running") {
            this.status = "stopping";
            this.event({ type: "info", msg: "Shutting down" });
        }
    }

    /* Main loop */

    private async spam(loop: boolean)
    {
        if (this.status === "stopping") {
            this.status = "stopped";
            this.requestRefetch = true; // so when it starts again it pulls fresh data
            this.event({ type: "info", msg: "Stopped as requested" });
            return;
        }
        try
        {
            // Rotate RPCs after a few transactions
            if (this.txsSinceRotate >= TXS_UNTIL_ROTATE) {
                this.txsSinceRotate = 0;
                const nextClient = this.rotator.nextSpamClient();
                this.event({ type: "debug", msg: `Rotating to next RPC: ${nextClient.rpcUrl}` });
                await sleep(SLEEP_MS_AFTER_RPC_CHANGE);
            }

            // Refetch data if requested
            if (this.requestRefetch) {
                await this.refetchData();
            }

            const counters = this.userCounters;

            // Register counter
            if (counters.register !== null && !counters.register.registered) {
                await this.registerUserCounter(counters.register.id);
            }
            // Claim counters
            else if (counters.claim.length > 0) {
                const counterIds = counters.claim.map(counter => counter.id);
                await this.claimUserCounters(counterIds);
            }
            // Delete unusable counters
            else if (counters.delete.length > 0) {
                const counterIds = counters.delete.map(counter => counter.id);
                await this.destroyUserCounters(counterIds);
            }
            // Current counter
            else if (loop) {
                if (counters.current === null) {
                    // Create a counter for the current epoch
                    await this.newUserCounter();
                } else {
                    // Increment the current counter
                    await this.incrementUserCounter(counters.current.ref);
                }
            }
        }
        catch (err) {
            this.requestRefetch = true;

            const errStr = String(err);
            const errCode = parseSpamError(errStr);

            // When the epoch changes, the counter is no longer incrementable
            if (errCode === SpamError.EWrongEpoch) {
                const msg = `Epoch change. Sleeping for ${SLEEP_MS_AFTER_EPOCH_CHANGE / 1000} seconds`;
                this.event({ type: "info", msg});
                if (this.txsSinceRotate >= TXS_UNTIL_ROTATE) {
                    this.txsSinceRotate = Math.floor(TXS_UNTIL_ROTATE / 2); // stay on current RPC
                }
                await sleep(SLEEP_MS_AFTER_EPOCH_CHANGE);
            }
            // User ran out of gas
            else if ( errStr.includes("No valid gas coins found for the transaction")
                    || /Balance of gas object \d+ is lower than the needed amount/.test(errStr)
            ) {
                this.status = "stopping";
                this.event({ type: "info", msg: "Out of gas. Stopping." });
            }
            // The validator didn't pick up the object changes yet. Happens sometimes when changing RPCs.
            else if ( errStr.includes("ObjectNotFound") || errStr.includes("not available for consumption") ) {
                const retryMsg = `Retrying in ${SLEEP_MS_AFTER_OBJECT_NOT_READY / 1000} seconds`;
                this.event({ type: "debug", msg: `Validator didn't sync yet. ${retryMsg}. RPC: ${this.getSpamClient().rpcUrl}.` });
                this.txsSinceRotate += 5; // spend less time on slow RPCs
                await sleep(SLEEP_MS_AFTER_OBJECT_NOT_READY);
            }
            // Network error
            else if ( errStr.includes("Failed to fetch") ) {
                const retryMsg = `Retrying in ${SLEEP_MS_AFTER_NETWORK_ERROR / 1000} seconds`;
                this.event({ type: "info", msg: `Network error. ${retryMsg}. Details: ${errStr}` });
                this.txsSinceRotate += 17; // spend less time on failing RPCs
                await sleep(SLEEP_MS_AFTER_NETWORK_ERROR);
            }
            // Consensus error
            else if ( errStr.includes("finality") || errStr.includes("quorum") ) {
                this.event({ type: "warn", msg: `Consensus error. Details: ${errStr}` });
                this.status = "stopping";

            }
            // Unexpected error
            else {
                const retryMsg = `Retrying in ${SLEEP_MS_AFTER_UNEXPECTED_ERROR / 1000} seconds`;
                this.event({ type: "warn", msg: `Unexpected error. ${retryMsg}. Details: ${errStr}` });
                this.txsSinceRotate += 17; // spend less time on failing RPCs
                await sleep(SLEEP_MS_AFTER_UNEXPECTED_ERROR);
            }
        }
        finally {
            if (loop) {
                this.spam(true);
            } else {
                this.status = "stopped";
                if (this.requestRefetch) {
                    await this.refetchData();
                }
                this.requestRefetch = true; // so when it starts again it pulls fresh data
                this.event({ type: "info", msg: "Done processing counters" });
            }
        }
    }

    private async refetchData(): Promise<void>
    {
        this.getSpamClient().setGasCoin(undefined);

        if (this.lastTxDigest) {
            this.event({ type: "debug", msg: `Waiting for tx: ${this.lastTxDigest}` });
            await this.getSuiClient().waitForTransactionBlock({
                digest: this.lastTxDigest,
                pollInterval: 500,
            });
        }

        this.event({ type: "debug", msg: "Fetching onchain data" });
        this.userCounters = await this.getSpamClient().fetchUserCountersAndClassify();
        this.requestRefetch = false;
    }

    private async registerUserCounter(counterId: string): Promise<void>
    {
        this.event({ type: "info", msg: "Registering counter: " + shortenSuiAddress(counterId) });
        await this.simulateLatencyOnLocalnet();
        const resp = await this.getSpamClient().registerUserCounter(counterId);
        this.requestRefetch = true;
        this.lastTxDigest = resp.digest;
        this.event({ type: "debug", msg: `Registering counter: ${resp.effects?.status.status}: ${resp.digest}` });
        if (resp.effects?.status.status !== "success") {
            throw new Error(resp.effects?.status.error);
        }
    }

    private async claimUserCounters(counterIds: string[]): Promise<void>
    {
        this.event({ type: "info", msg: "Claiming counters: " + counterIds.map(objId => shortenSuiAddress(objId)).join(", ") });
        await this.simulateLatencyOnLocalnet();
        const resp = await this.getSpamClient().claimUserCounters(counterIds);
        this.requestRefetch = true;
        this.lastTxDigest = resp.digest;
        this.event({ type: "debug", msg: `Claiming counters: ${resp.effects?.status.status}: ${resp.digest}` });
        if (resp.effects?.status.status !== "success") {
            throw new Error(resp.effects?.status.error);
        }
    }

    private async destroyUserCounters(counterIds: string[]): Promise<void>
    {
        this.event({ type: "info", msg: "Deleting counters: " + counterIds.map(objId => shortenSuiAddress(objId)).join(", ") });
        await this.simulateLatencyOnLocalnet();
        const resp = await this.getSpamClient().destroyUserCounters(counterIds);
        this.requestRefetch = true;
        this.lastTxDigest = resp.digest;
        this.event({ type: "debug", msg: `Deleting counters: ${resp.effects?.status.status}: ${resp.digest}` });
        if (resp.effects?.status.status !== "success") {
            throw new Error(resp.effects?.status.error);
        }
    }

    private async newUserCounter(): Promise<void>
    {
        this.event({ type: "info", msg: "Creating counter" });
        await this.simulateLatencyOnLocalnet();
        const resp = await this.getSpamClient().newUserCounter();
        this.requestRefetch = true;
        this.lastTxDigest = resp.digest;
        this.event({ type: "debug", msg: `Creating counter: ${resp.effects?.status.status}: ${resp.digest}` });
        if (resp.effects?.status.status !== "success") {
            throw new Error(resp.effects?.status.error);
        }
    }

    private async incrementUserCounter(counterRef: SuiObjectRef): Promise<void>
    {
        this.event({ type: "debug", msg: "Incrementing counter" });
        if (!this.userCounters.current) {
            throw new Error("Spammer.userCounters.current does not exist");
        }
        await this.simulateLatencyOnLocalnet();
        this.txsSinceRotate += 1;
        const resp = await this.getSpamClient().incrementUserCounter(counterRef);
        if (resp.effects?.status.status !== "success") {
            throw new Error(resp.effects?.status.error);
        }
        this.lastTxDigest = resp.digest;
        // We don't `requestRefetch` here, unlike create/register/claim/delete txs.
        // Instead, we increment current.tx_count manually,
        // and set current.ref to the SuiObjectRef found in the tx effects.
        this.userCounters.current.tx_count++;
        this.userCounters.current.ref = resp.effects.mutated!.find(mutatedObj =>
            mutatedObj.reference.objectId == counterRef.objectId
        )!.reference;
    }
}
