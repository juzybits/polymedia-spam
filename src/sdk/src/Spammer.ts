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

const TXS_UNTIL_ROTATE = 50;
const SLEEP_MS_AFTER_RPC_CHANGE = 1000;
const SLEEP_MS_AFTER_OBJECT_NOT_READY = 1000;
const SLEEP_MS_AFTER_NETWORK_ERROR = 15000;
const SLEEP_MS_AFTER_UNEXPECTED_ERROR = 30000;

export class Spammer
{
    public status: SpamStatus;
    public userCounters: UserCounters;
    private requestRefetch: { refetch: boolean; txDigest?: string };
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
        this.requestRefetch = { refetch: true }; // so when it starts it pulls the data
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
            this.requestRefetch = { refetch: true }; // so when it starts again it pulls fresh data
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
            if (this.requestRefetch.refetch) {
                await this.refetchData();
            }

            const counters = this.userCounters;

            // Register counter
            if (counters.register !== null && !counters.register.registered)
            {
                this.event({ type: "info", msg: "Registering counter: " + shortenSuiAddress(counters.register.id) });
                await this.simulateLatencyOnLocalnet();
                const resp = await this.getSpamClient().registerUserCounter(counters.register.id);
                this.requestRefetch = { refetch: true, txDigest: resp.digest };
                this.event({ type: "debug", msg: `Registering counter resp: ${resp.effects?.status.status}` });
                if (resp.effects?.status.status !== "success") {
                    throw new Error(resp.effects?.status.error);
                }
            }

            // Claim counters
            if (counters.claim.length > 0)
            {
                this.event({ type: "info", msg: "Claiming counters: " + counters.claim.map(c => shortenSuiAddress(c.id)).join(", ") });
                await this.simulateLatencyOnLocalnet();
                const counterIds = counters.claim.map(counter => counter.id);
                const resp = await this.getSpamClient().claimUserCounters(counterIds);
                this.requestRefetch = { refetch: true, txDigest: resp.digest };
                this.event({ type: "debug", msg: `Claiming counters resp: ${resp.effects?.status.status}` });
                if (resp.effects?.status.status !== "success") {
                    throw new Error(resp.effects?.status.error);
                }
            }

            // Delete unusable counters
            if (counters.delete.length > 0)
            {
                this.event({ type: "info", msg: "Deleting counters: " + counters.delete.map(c => shortenSuiAddress(c.id)).join(", ") });
                await this.simulateLatencyOnLocalnet();
                const counterIds = counters.delete.map(counter => counter.id);
                const resp = await this.getSpamClient().destroyUserCounters(counterIds);
                this.requestRefetch = { refetch: true, txDigest: resp.digest };
                this.event({ type: "debug", msg: `Deleting counters resp: ${resp.effects?.status.status}` });
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
                const resp = await this.getSpamClient().newUserCounter();
                this.requestRefetch = { refetch: true, txDigest: resp.digest };
                this.event({ type: "debug", msg: `Creating counter resp: ${resp.effects?.status.status}` });
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
                this.event({ type: "debug", msg: `Increment counter resp: ${resp.effects?.status.status}` });
                if (resp.effects?.status.status !== "success") {
                    throw new Error(resp.effects?.status.error);
                }
                curr.tx_count++;
                curr.ref = resp.effects.mutated!.find(mutatedObj =>
                    mutatedObj.reference.objectId == curr.id
                )!.reference;
            }
        }
        catch (err) {
            const errStr = String(err);
            const errCode = parseSpamError(errStr);

            // When the epoch changes, the counter is no longer incrementable
            if (errCode === SpamError.EWrongEpoch) {
                this.requestRefetch = { refetch: true };
                this.event({ type: "info", msg: "Epoch change"});
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
                this.requestRefetch = { refetch: true };
                await sleep(SLEEP_MS_AFTER_NETWORK_ERROR);
            }
            // Unexpected error. Sleep the longest here out of caution, in case there was an
            // error like "Transaction timed out before reaching finality" (study equivocation).
            // https://github.com/MystenLabs/sui/blob/main/crates/sui-types/src/quorum_driver_types.rs#L49
            else {
                const retryMsg = `Retrying in ${SLEEP_MS_AFTER_UNEXPECTED_ERROR / 1000} seconds`;
                this.event({ type: "info", msg: `Unexpected error. ${retryMsg}. Details: ${errStr}` });
                this.txsSinceRotate += 17; // spend less time on failing RPCs
                this.requestRefetch = { refetch: true };
                await sleep(SLEEP_MS_AFTER_UNEXPECTED_ERROR);
            }
        }
        finally {
            this.spam();
        }
    }

    private async refetchData()
    {
        this.getSpamClient().setGasCoin(undefined);

        if (this.requestRefetch.txDigest) {
            this.event({ type: "debug", msg: `Waiting for tx: ${this.requestRefetch.txDigest}` });
            await this.getSuiClient().waitForTransactionBlock({
                digest: this.requestRefetch.txDigest,
                pollInterval: 500,
            });
        }

        this.event({ type: "debug", msg: "Fetching onchain data" });
        this.userCounters = await this.getSpamClient().fetchUserCountersAndClassify();
        this.requestRefetch = { refetch: false };
    }
}
