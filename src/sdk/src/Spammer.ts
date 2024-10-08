import { SuiClient, SuiObjectRef } from "@mysten/sui/client";
import { Signer } from "@mysten/sui/cryptography";
import { NetworkName, shortenAddress, sleep, validateAndNormalizeAddress } from "@polymedia/suitcase-core";
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
const SLEEP_MS_AFTER_EPOCH_CHANGE = 30000;
const SLEEP_MS_AFTER_NETWORK_ERROR = 30000;
const SLEEP_MS_AFTER_UNEXPECTED_ERROR = 30000;

export class Spammer
{
    public status: SpamStatus;
    public userCounters: UserCounters;
    protected requestRefetch: boolean;
    protected lastTxDigest: string|null;
    protected eventHandler: SpamEventHandler|undefined;
    protected claimAddress!: string;
    protected txsSinceRotate: number;
    protected readonly rotator: SpamClientRotator;
    protected simulateLatencyOnLocalnet: () => Promise<void>;

    constructor(
        keypair: Signer,
        network: NetworkName,
        rpcUrls: string[],
        eventHandler?: SpamEventHandler,
        claimAddress?: string,
    ) {
        this.status = "stopped";
        this.userCounters = emptyUserCounters();
        this.requestRefetch = true; // so when it starts it pulls fresh data
        this.lastTxDigest = null;
        this.eventHandler = eventHandler;
        if (!claimAddress) {
            this.claimAddress = keypair.toSuiAddress();
        } else {
            this.setClaimAddress(claimAddress); // throws error if invalid
        }
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

    protected event(event: SpamEvent) {
        this.eventHandler && this.eventHandler(event);
    }

    /* Getters and setters */

    public getSpamClient(): SpamClient {
        return this.rotator.getSpamClient();
    }

    public getSuiClient(): SuiClient  {
        return this.rotator.getSuiClient();
    }

    public getClaimAddress(): string {
        return this.claimAddress;
    }

    public setClaimAddress(newClaimAddress: string): void {
        const cleanAddress = validateAndNormalizeAddress(newClaimAddress);
        if (!cleanAddress) {
            throw Error(`Invalid claim address: ${newClaimAddress}`);
        }
        this.claimAddress = cleanAddress;
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

    protected async spam(loop: boolean)
    {
        if (this.status === "stopping") {
            this.status = "stopped";
            this.requestRefetch = true; // so when it starts again it pulls fresh data
            this.event({ type: "info", msg: "Stopped as requested" });
            return;
        }

        let hasToDelete = false;
        let hasToClaim = false;
        let hasToRegister = false;
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
            hasToDelete = counters.delete.length > 0;
            hasToClaim = counters.claim.length > 0;
            hasToRegister = counters.register !== null && !counters.register.registered;

            // Delete unusable counters
            if (hasToDelete) {
                const counterIds = counters.delete.map(counter => counter.id);
                await this.destroyUserCounters(counterIds);
                hasToDelete = false;
            }
            // Claim counters
            else if (hasToClaim) {
                const counterIds = counters.claim.map(counter => counter.id);
                await this.claimUserCounters(counterIds);
                hasToClaim = false;
            }
            // Register counter
            else if (hasToRegister) {
                await this.registerUserCounter(counters.register!.id);
                hasToRegister = false;
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
                this.event({ type: "warn", msg: `Network error. ${retryMsg}. Details: ${errStr}` });
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
            // regular spam loop
            if (loop) {
                this.spam(loop);
            }
            // one-off, but still has old counters to process
            else if (hasToDelete || hasToClaim || hasToRegister) {
                this.spam(loop);
            }
            // one-off, done processing old counters
            else {
                this.status = "stopped";
                if (this.requestRefetch) {
                    await this.refetchData();
                }
                this.requestRefetch = true; // so when it starts again it pulls fresh data
                this.event({ type: "info", msg: "Done processing counters" });
            }
        }
    }

    protected async refetchData(): Promise<void>
    {
        // Reset these values so the SpamClient re-fetches them for the next tx
        this.getSpamClient().setGasCoin(undefined);
        this.getSpamClient().setGasPrice(undefined);

        if (this.lastTxDigest) {
            this.event({ type: "debug", msg: `Waiting for tx: ${this.lastTxDigest}` });
            await this.getSuiClient().waitForTransaction({
                digest: this.lastTxDigest,
                pollInterval: 500,
            });
        }

        this.event({ type: "debug", msg: "Fetching onchain data" });
        this.userCounters = await this.getSpamClient().fetchUserCountersAndClassify();
        this.requestRefetch = false;
    }

    protected async registerUserCounter(counterId: string): Promise<void>
    {
        this.event({ type: "info", msg: "Registering counter: " + shortenAddress(counterId) });
        await this.simulateLatencyOnLocalnet();
        const resp = await this.getSpamClient().registerUserCounter(counterId);
        this.requestRefetch = true;
        this.lastTxDigest = resp.digest;
        this.event({ type: "debug", msg: `Registering counter: ${resp.effects?.status.status}: ${resp.digest}` });
        if (resp.effects?.status.status !== "success") {
            throw new Error(resp.effects?.status.error);
        }
    }

    protected async claimUserCounters(counterIds: string[]): Promise<void>
    {
        this.event({ type: "info", msg: "Claiming counters: " + counterIds.map(objId => shortenAddress(objId)).join(", ") });
        await this.simulateLatencyOnLocalnet();
        const resp = await this.getSpamClient().claimUserCounters(counterIds, this.claimAddress);
        this.requestRefetch = true;
        this.lastTxDigest = resp.digest;
        this.event({ type: "debug", msg: `Claiming counters: ${resp.effects?.status.status}: ${resp.digest}` });
        if (resp.effects?.status.status !== "success") {
            throw new Error(resp.effects?.status.error);
        }
    }

    protected async destroyUserCounters(counterIds: string[]): Promise<void>
    {
        this.event({ type: "info", msg: "Deleting counters: " + counterIds.map(objId => shortenAddress(objId)).join(", ") });
        await this.simulateLatencyOnLocalnet();
        const resp = await this.getSpamClient().destroyUserCounters(counterIds);
        this.requestRefetch = true;
        this.lastTxDigest = resp.digest;
        this.event({ type: "debug", msg: `Deleting counters: ${resp.effects?.status.status}: ${resp.digest}` });
        if (resp.effects?.status.status !== "success") {
            throw new Error(resp.effects?.status.error);
        }
    }

    protected async newUserCounter(): Promise<void>
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

    protected async incrementUserCounter(counterRef: SuiObjectRef): Promise<void>
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
