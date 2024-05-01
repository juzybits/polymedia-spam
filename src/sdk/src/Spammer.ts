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
const TXS_UNTIL_ROTATE = 50;
const SLEEP_MS_AFTER_RPC_CHANGE = 1000;
const SLEEP_MS_AFTER_OBJECT_NOT_READY = 1000;
const SLEEP_MS_AFTER_NETWORK_ERROR = 10000;
const SLEEP_MS_AFTER_FINALITY_ERROR = 30000;

export class Spammer
{
    public status: SpamStatus;
    public userCounters: UserCounters;
    private requestRefresh: boolean;
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
        this.requestRefresh = true; // so when it starts it pulls the data
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

    public start() {
        if (this.status === "stopped") {
            this.status = "running";
            this.spam();
            this.event({ type: "info", msg: "Starting"});
        }
    }

    public stop() {
        if (this.status === "running") {
            this.status = "stopping";
            this.event({ type: "info", msg: "Shutting down" });
        }
    }

    /* Main loop */

    private async spam()
    {
        if (this.status === "stopping") {
            this.status = "stopped";
            this.requestRefresh = true; // so when it starts again it pulls fresh data
            this.event({ type: "info", msg: "Stopped as requested" });
            return;
        }
        try
        {
            // Refetch data if requested
            if (this.requestRefresh) {
                this.requestRefresh = false;
                this.event({ type: "debug", msg: "Fetching onchain data" });
                this.userCounters = await this.getSpamClient().fetchUserCountersAndClassify();
                await this.getSpamClient().fetchAndSetGasCoin();
            }

            // Rotate RPCs after a few transactions
            if (this.txsSinceRotate >= TXS_UNTIL_ROTATE) {
                this.txsSinceRotate = 0;
                const nextClient = this.rotator.nextSpamClient();
                this.event({ type: "debug", msg: `Rotating to next RPC: ${nextClient.rpcUrl}` });
                await sleep(SLEEP_MS_AFTER_RPC_CHANGE);
            }

            const counters = this.userCounters;

            // Register counter
            if (counters.register !== null && !counters.register.registered)
            {
                this.event({ type: "info", msg: "Registering counter: " + shortenSuiAddress(counters.register.id) });
                await this.simulateLatencyOnLocalnet();
                this.requestRefresh = true;
                const resp = await this.getSpamClient().registerUserCounter(counters.register.id);
                this.event({ type: "debug", msg: `registerUserCounter resp: ${resp.effects?.status.status}` });
                if (resp.effects?.status.status !== "success") {
                    throw new Error(resp.effects?.status.error);
                }
                counters.register.registered = true;
            }

            // Claim counters
            if (counters.claim.length > 0)
            {
                this.event({ type: "info", msg: "Claiming counters: " + counters.claim.map(c => shortenSuiAddress(c.id)).join(", ") });
                await this.simulateLatencyOnLocalnet();
                this.requestRefresh = true;
                const counterIds = counters.claim.map(counter => counter.id);
                const resp = await this.getSpamClient().claimUserCounters(counterIds);
                this.event({ type: "debug", msg: `destroyUserCounters resp: ${resp.effects?.status.status}` });
                if (resp.effects?.status.status !== "success") {
                    throw new Error(resp.effects?.status.error);
                }
                counters.claim = [];
            }

            // Delete unusable counters
            if (counters.delete.length > 0)
            {
                this.event({ type: "info", msg: "Deleting counters: " + counters.delete.map(c => shortenSuiAddress(c.id)).join(", ") });
                await this.simulateLatencyOnLocalnet();
                this.requestRefresh = true;
                const counterIds = counters.delete.map(counter => counter.id);
                const resp = await this.getSpamClient().destroyUserCounters(counterIds);
                this.event({ type: "debug", msg: `destroyUserCounters resp: ${resp.effects?.status.status}` });
                if (resp.effects?.status.status !== "success") {
                    throw new Error(resp.effects?.status.error);
                }
                counters.delete = [];
            }

            // Create counter for current epoch
            if (counters.current === null)
            {
                this.event({ type: "info", msg: "Creating counter" });
                await this.simulateLatencyOnLocalnet();
                this.requestRefresh = true;
                const resp = await this.getSpamClient().newUserCounter();
                this.event({ type: "debug", msg: `newUserCounter resp: ${resp.effects?.status.status}` });
                if (resp.effects?.status.status !== "success") {
                    throw new Error(resp.effects?.status.error);
                }
            }
            // Increment current counter
            else {
                await this.simulateLatencyOnLocalnet();
                this.txsSinceRotate += 1;
                const curr = counters.current;
                const resp = await this.getSpamClient().incrementUserCounter(curr.ref);
                this.event({ type: "debug", msg: `incrementUserCounter resp: ${resp.effects?.status.status}` });
                if (resp.effects?.status.status !== "success") {
                    throw new Error(resp.effects?.status.error);
                }
                curr.tx_count++;
                curr.ref = resp.effects!.mutated!.find(mutatedObj =>
                    mutatedObj.reference.objectId == curr.id
                )!.reference;
            }
        }
        catch (err) {
            const errStr = String(err);
            const errStrLower = errStr.toLowerCase();
            const errCode = parseSpamError(errStr);

            // When the epoch changes, the counter is no longer incrementable
            if (errCode === SpamError.EWrongEpoch) {
                this.requestRefresh = true;
                this.event({ type: "info", msg: "Epoch change"});
            }
            // User ran out of gas
            else if ( errStr.includes("No valid gas coins found for the transaction")
                    || /Balance of gas object \d+ is lower than the needed amount/.test(errStr)
            ) {
                this.status = "stopping";
                this.event({ type: "info", msg: "Out of gas. Stopping." });
            }
            // The validator didn't pick up the object changes yet. Often happens when changing RPCs.
            else if ( errStr.includes("ObjectNotFound") || errStr.includes("not available for consumption") ) {
                const retryMsg = `Retrying in ${SLEEP_MS_AFTER_OBJECT_NOT_READY / 1000} seconds`;
                this.event({ type: "debug", msg: `Validator didn't sync yet. ${retryMsg}. RPC: ${this.getSpamClient().rpcUrl}.` });
                this.txsSinceRotate += 5; // spend less time on slow RPCs
                await sleep(SLEEP_MS_AFTER_OBJECT_NOT_READY);
            }
            // An attempt to prevent equivocation issues
            else if ( errStrLower.includes("finality") || errStrLower.includes("timeout") || errStrLower.includes("timed out") ) {
                const retryMsg = `Retrying in ${SLEEP_MS_AFTER_FINALITY_ERROR / 1000} seconds`;
                this.event({ type: "info", msg: `Finality/timeout error. ${retryMsg}. Original error: ${errStr}` });
                this.txsSinceRotate += 17; // spend less time on failing RPCs
                this.requestRefresh = true;
                await sleep(SLEEP_MS_AFTER_FINALITY_ERROR);
            }
            // Network error
            else if ( errStr.includes("Failed to fetch") ) {
                const retryMsg = `Retrying in ${SLEEP_MS_AFTER_NETWORK_ERROR / 1000} seconds`;
                this.event({ type: "info", msg: `Network error. ${retryMsg}. Original error: ${errStr}` });
                this.txsSinceRotate += 17; // spend less time on failing RPCs
                this.requestRefresh = true;
                await sleep(SLEEP_MS_AFTER_NETWORK_ERROR);
            }
            // Unexpected error
            else {
                const retryMsg = `Retrying in ${SLEEP_MS_AFTER_NETWORK_ERROR / 1000} seconds`;
                this.event({ type: "info", msg: `Unexpected error. ${retryMsg}. Original error: ${errStr}` });
                this.txsSinceRotate += 17; // spend less time on failing RPCs
                this.requestRefresh = true;
                await sleep(SLEEP_MS_AFTER_NETWORK_ERROR);
            }
        }
        finally {
            this.spam();
        }
    }
}
