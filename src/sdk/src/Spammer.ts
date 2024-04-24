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

// TODO handle network errors and txn failures (resp.effects.status.status !== "success")

export class Spammer
{
    public status: SpamStatus;
    public userCounters: UserCounters;
    private requestRefresh: boolean;
    private eventHandlers: Set<SpamEventHandler>;
    private readonly rotator: SpamClientRotator;

    constructor(
        keypair: Signer,
        network: NetworkName,
        rpcUrls: string[],
        eventHandler: SpamEventHandler,
    ) {
        this.status = "stopped";
        this.userCounters = emptyUserCounters();
        this.rotator = new SpamClientRotator(keypair, network, rpcUrls);
        this.requestRefresh = true; // so when it starts it pulls the data
        this.eventHandlers = new Set<SpamEventHandler>([eventHandler]);
    }

    /* Events */

    public addEventHandler(handler: SpamEventHandler) {
        this.eventHandlers.add(handler);
    }

    public removeEventHandler(handler: SpamEventHandler) {
        this.eventHandlers.delete(handler);
    }

    private onEvent(event: SpamEvent) {
        this.eventHandlers.forEach(handler => handler(event));
    }

    /* Client accessors */

    public getSpamClient(): SpamClient {
        return this.rotator.getSpamClient();
    }

    public getSuiClient(): SuiClient  {
        return this.rotator.getSuiClient();
    }

    /* Start and stop */

    public stop() {
        this.status = "stopping";
        this.onEvent({ type: "info", msg: "Shutting down" });
    }

    public async start()
    {
        if (this.status == "running") {
            this.onEvent({ type: "warn", msg: "Already running" });
            return;
        }

        if (this.status === "stopping") {
            this.status = "stopped";
            this.requestRefresh = true; // so when it starts again it pulls fresh data
            this.onEvent({ type: "info", msg: "Stopped as requested" });
            return;
        }

        this.status = "running";

        try {
            if (this.requestRefresh) {
                this.requestRefresh = false;
                this.userCounters = await this.rotator.getSpamClient().fetchUserCountersAndClassify();
            }

            const counters = this.userCounters;

            if (counters.register !== null && !counters.register.registered) {
                this.onEvent({ type: "info", msg: "Registering counter: " + shortenSuiAddress(counters.register.id) });
                const resp = await this.rotator.getSpamClient().registerUserCounter(counters.register.id);
                counters.register.registered = true;
                this.requestRefresh = true;
                this.onEvent({
                    type: "debug",
                    msg: "registerUserCounter resp: " + JSON.stringify(resp, null, 2),
                });
            }

            if (counters.claim.length > 0) {
                this.onEvent({ type: "info", msg: "Claiming counters: " + counters.claim.map(c => shortenSuiAddress(c.id)).join(", ") });
                const counterIds = counters.claim.map(counter => counter.id);
                const resp = await this.rotator.getSpamClient().claimUserCounters(counterIds);
                counters.claim = [];
                this.requestRefresh = true;
                this.onEvent({
                    type: "debug",
                    msg: "destroyUserCounters resp: " + JSON.stringify(resp, null, 2),
                });
            }

            if (counters.delete.length > 0) {
                this.onEvent({ type: "info", msg: "Deleting counters: " + counters.delete.map(c => shortenSuiAddress(c.id)).join(", ") });
                const counterIds = counters.delete.map(counter => counter.id);
                const resp = await this.rotator.getSpamClient().destroyUserCounters(counterIds);
                counters.delete = [];
                this.requestRefresh = true;
                this.onEvent({ type: "debug", msg: "destroyUserCounters resp: " + JSON.stringify(resp, null, 2) });
            }

            if (counters.current === null) {
                this.onEvent({ type: "info", msg: "Creating counter" });
                const resp = await this.rotator.getSpamClient().newUserCounter();
                this.requestRefresh = true;
                this.onEvent({ type: "debug", msg: "newUserCounter resp: " + JSON.stringify(resp, null, 2) });
            } else {
                this.rotator.getSpamClient().network == "localnet" && await sleep(333); // simulate latency
                const curr = counters.current;
                const resp = await this.rotator.getSpamClient().incrementUserCounter(curr.ref);
                curr.tx_count++;
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                curr.ref = resp.effects!.mutated!.find(mutatedObj =>
                    mutatedObj.reference.objectId == curr.id
                )!.reference;
                this.onEvent({ type: "debug", msg: "incrementUserCounter resp: " + JSON.stringify(resp, null, 2) });
            }
        }
        catch (err) {
            const errStr = String(err);
            const errCode = parseSpamError(errStr);
            if (errCode === SpamError.EWrongEpoch) {
                // Expected error: when the epoch changes, the counter is no longer incrementable
                this.requestRefresh = true;
                this.onEvent({ type: "info", msg: "Epoch change"});
            }
            else {
                // Unexpected error
                this.status = "stopping";
                this.onEvent({ type: "warn", msg: String(err) });
            }
        }
        finally {
            // keep the loop going unless stop was requested
            if (this.status === "running") {
                this.status = "stopped";
            }
            this.start();
        }
    }
}
