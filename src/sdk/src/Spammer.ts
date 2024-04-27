import { SuiClient } from "@mysten/sui.js/client";
import { Signer } from "@mysten/sui.js/cryptography";
import { NetworkName, shortenSuiAddress, sleep } from "@polymedia/suits";
import { SpamClient } from "./SpamClient";
import { SpamError, parseSpamError } from "./errors";
import { SpamClientRotator } from "./SpamClientRotator";
import { UserCounters, emptyUserCounters } from "./types";

export type SpamStatus = "stopped" | "running" | "stopping";

export type SpamEvent = {
    type: "debug" | "info" | "warn" | "error";
    msg: string;
};

export type SpamEventHandler = (event: SpamEvent) => void;

// Rotate to the next RPC endpoint after these many `increment_user_counter` transactions
const INCREMENT_TXS_UNTIL_ROTATE = 50;
const SLEEP_MS_AFTER_RPC_CHANGE = 1000;
const SLEEP_MS_AFTER_OBJECT_NOT_READY = 1000;
const SLEEP_MS_AFTER_NETWORK_ERROR = 3000;

export class Spammer
{
    public status: SpamStatus;
    public userCounters: UserCounters;
    private requestRefresh: boolean;
    private eventHandler: SpamEventHandler|undefined;
    private incrementTxsSinceRotate: number;
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
        this.requestRefresh = true; // so when it starts it pulls the data
        this.eventHandler = eventHandler;
        this.incrementTxsSinceRotate = 0;
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

    private onEvent(event: SpamEvent) {
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

    public start() {
        if (this.status === "stopped") {
            this.status = "running";
            this.spam();
            this.onEvent({ type: "info", msg: "Starting" });
        }
    }

    public stop() {
        if (this.status === "running") {
            this.status = "stopping";
            this.onEvent({ type: "info", msg: "Shutting down" });
        }
    }

    /* Main loop */

    private async spam()
    {
        if (this.status === "stopping") {
            this.status = "stopped";
            this.requestRefresh = true; // so when it starts again it pulls fresh data
            this.onEvent({ type: "info", msg: "Stopped as requested" });
            return;
        }
        try
        {
            // Refetch data if requested
            if (this.requestRefresh) {
                this.requestRefresh = false;
                this.userCounters = await this.getSpamClient().fetchUserCountersAndClassify();
            }

            // Rotate RPCs after a few transactions
            if (this.incrementTxsSinceRotate >= INCREMENT_TXS_UNTIL_ROTATE) {
                this.incrementTxsSinceRotate = 0;
                const nextClient = this.rotator.nextSpamClient();
                this.onEvent({ type: "info", msg: `Rotating to next RPC: ${nextClient.rpcUrl}` });
                await sleep(SLEEP_MS_AFTER_RPC_CHANGE);
            }

            const counters = this.userCounters;

            // Register counter
            if (counters.register !== null && !counters.register.registered)
            {
                this.onEvent({ type: "info", msg: "Registering counter: " + shortenSuiAddress(counters.register.id) });
                await this.simulateLatencyOnLocalnet();
                this.requestRefresh = true;
                const resp = await this.getSpamClient().registerUserCounter(counters.register.id);
                counters.register.registered = true;
                this.onEvent({
                    type: "debug",
                    msg: `registerUserCounter resp: ${resp.effects?.status.status}`,
                });
            }

            // Claim counters
            if (counters.claim.length > 0)
            {
                this.onEvent({ type: "info", msg: "Claiming counters: " + counters.claim.map(c => shortenSuiAddress(c.id)).join(", ") });
                await this.simulateLatencyOnLocalnet();
                this.requestRefresh = true;
                const counterIds = counters.claim.map(counter => counter.id);
                const resp = await this.getSpamClient().claimUserCounters(counterIds);
                counters.claim = [];
                this.onEvent({
                    type: "debug",
                    msg: `destroyUserCounters resp: ${resp.effects?.status.status}`,
                });
            }

            // Delete unusable counters
            if (counters.delete.length > 0)
            {
                this.onEvent({ type: "info", msg: "Deleting counters: " + counters.delete.map(c => shortenSuiAddress(c.id)).join(", ") });
                await this.simulateLatencyOnLocalnet();
                this.requestRefresh = true;
                const counterIds = counters.delete.map(counter => counter.id);
                const resp = await this.getSpamClient().destroyUserCounters(counterIds);
                counters.delete = [];
                this.onEvent({ type: "debug", msg: `destroyUserCounters resp: ${resp.effects?.status.status}` });
            }

            // Create counter for current epoch
            if (counters.current === null)
            {
                this.onEvent({ type: "info", msg: "Creating counter" });
                await this.simulateLatencyOnLocalnet();
                this.requestRefresh = true;
                const resp = await this.getSpamClient().newUserCounter();
                this.onEvent({ type: "debug", msg: `newUserCounter resp: ${resp.effects?.status.status}` });
            }
            // Increment current counter
            else {
                await this.simulateLatencyOnLocalnet();
                this.incrementTxsSinceRotate += 1; // only count this kind of tx towards rotation limit
                const curr = counters.current;
                const resp = await this.getSpamClient().incrementUserCounter(curr.ref);
                curr.tx_count++;
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                curr.ref = resp.effects!.mutated!.find(mutatedObj =>
                    mutatedObj.reference.objectId == curr.id
                )!.reference;
                this.onEvent({ type: "debug", msg: `incrementUserCounter resp: ${resp.effects?.status.status}` });
            }
        }
        catch (err) {
            const errStr = String(err);
            const errCode = parseSpamError(errStr);

            // When the epoch changes, the counter is no longer incrementable
            if (errCode === SpamError.EWrongEpoch) {
                this.requestRefresh = true;
                this.onEvent({ type: "info", msg: "Epoch change"});
            }
            // User ran out of gas
            else if ( /Balance of gas object \d+ is lower than the needed amount/.test(errStr) ) {
                this.status = "stopping";
                this.onEvent({ type: "info", msg: "Out of gas. Stopping." });
            }
            // The validator didn't pick up the object changes yet. Often happens when changing RPCs.
            else if ( errStr.includes("ObjectNotFound") || errStr.includes("not available for consumption") ) {
                this.onEvent({ type: "debug", msg: `Validator didn't sync yet. Retrying shortly. RPC: ${this.getSpamClient().rpcUrl}.` });
                await sleep(SLEEP_MS_AFTER_OBJECT_NOT_READY);
            }
            // Network error
            else if ( errStr.includes("Failed to fetch") ) {
                this.onEvent({ type: "info", msg: `Network error. Retrying shortly. Original error: ${errStr}` });
                await sleep(SLEEP_MS_AFTER_NETWORK_ERROR);
            }
            // Unexpected error
            else {
                this.status = "stopping";
                this.onEvent({ type: "warn", msg: errStr });
            }
        }
        finally {
            this.spam();
        }
    }
}
