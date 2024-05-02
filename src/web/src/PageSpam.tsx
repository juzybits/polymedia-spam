import { UserCounter } from "@polymedia/spam-sdk";
import { formatNumber } from "@polymedia/suits";
import { LinkToExplorerObj } from "@polymedia/webutils";
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { StatusSpan } from "./components/StatusSpan";
import { EpochData, formatEpochPeriod, getEpochTimes } from "./lib/epochs";

export const PageSpam: React.FC = () =>
{
    /* State */

    const { network, balances, spammer, spamView } = useOutletContext<AppContext>();
    const [ currEpoch, setCurrEpoch ] = useState<EpochData>();
    const isDisabled = false;

    const isLoading = spamView.counters.epoch === -1 || balances.sui === -1 || !currEpoch;

    /* Functions */

    useEffect(() => {
        setCurrEpoch(undefined);
        updateCurrEpoch();

        const updateFrequency = ["localnet", "devnet"].includes(network) ? 5_000 : 45_000;
        const updatePeriodically = setInterval(updateCurrEpoch, updateFrequency);

        return () => {
            clearInterval(updatePeriodically);
        };
    }, [spammer.current, network]);

    const start = () => {
        if (spammer.current.status === "stopped") {
            spammer.current.start();
        }
    };

    const stop = () => {
        if (spammer.current.status === "running") {
            spammer.current.stop();
        }
    };

    const updateCurrEpoch = async () => {
        try {
            const suiState = await spammer.current.getSuiClient().getLatestSuiSystemState();
            setCurrEpoch({
                epochNumber: Number(suiState.epoch),
                durationMs: Number(suiState.epochDurationMs),
                startTimeMs: Number(suiState.epochStartTimestampMs),
            });
        } catch (err) {
            console.warn("epoch update failed");
        }
    };

    /* HTML */

    const counters = spamView.counters;
    const hasCounters = Boolean(
        counters.current || counters.register || counters.claim.length || counters.delete.length
    );
    const isLowSuiBalance = balances.sui < 0.003;

    const Balances: React.FC = () => {
        if (!balances) {
            return null;
        }
        return <>
            <p>SUI balance: {isLoading ? "loading..." : formatNumber(balances.sui, "compact")}</p>
            <p>SPAM balance: {isLoading ? "loading..." : formatNumber(balances.spam, "compact")}</p>
        </>;
    };

    const TopUp: React.FC = () => {
        if (isLoading || !isLowSuiBalance || isDisabled) {
            return null;
        }
        return <>
            <p>Top up your wallet to start.</p>
            <Link className="btn" to="/wallet">
                TOP UP
            </Link>
        </>;
    };

    const SpamOrStopButton: React.FC = () => {
        if (isLoading || isLowSuiBalance || isDisabled) {
            return null;
        }
        if (spammer.current.status === "stopped") {
            return <button className="btn" onClick={start}>SPAM</button>;
        }
        if (spammer.current.status === "running") {
            return <button className="btn" onClick={stop}>STOP</button>;
        }
        return <button className="btn" disabled>STOPPING</button>;
    };

    const CounterCard: React.FC<{
        type: "current" | "register" | "claim" | "delete";
        counter: UserCounter;
    }> = ({
        type,
        counter,
    }) => {
        let txClass = "";
        let status: string;
        if (type === "current") {
            if (spammer.current.status === "running") {
                status = "Spamming";
                txClass = "blink";
            } else {
                status = isLowSuiBalance
                    ? "Top up your wallet to spam this counter"
                    : "Ready to spam";
            }
        }
        else if (type === "register") {
            status = !counter.registered
                ? `Can be registered until the end of epoch ${counter.epoch+1}`
                : `Registered, can mint SPAM from epoch ${counter.epoch+2}`;
        }
        else if (type === "claim") {
            status = "Can mint SPAM at any time";
        }
        else {
            status = "Unusable, will be deleted";
        }

        const epochTimes = currEpoch && getEpochTimes(counter.epoch, currEpoch);

        return <div className={`counter-card ${type}`}>
            <div>
                <div className="counter-epoch">
                    Epoch {counter.epoch}
                </div>
                <div>
                    <LinkToExplorerObj network={network} objId={counter.id} />
                </div>
            </div>

            <div>
                <div className={txClass}>
                    You sent {counter.tx_count} transactions
                </div>
            </div>

            <div>
                <div>
                    {status}
                </div>
            </div>

            {epochTimes &&
            <div>
                <div>
                    {formatEpochPeriod(epochTimes.startTime, epochTimes.endTime, network)}
                </div>
            </div>
            }
        </div>;
    };

    const EventLog: React.FC = () => {
        if (spamView.events.length === 0) {
            return null;
        }
        const reversedEvents = [];
        for (let i = spamView.events.length - 1; i >= 0; i--) {
            reversedEvents.push(
            <div className="event" key={i}>
                <span className="event-time">
                    {spamView.events[i].time}
                </span>
                <span className="event-msg">
                    {spamView.events[i].msg}
                </span>
            </div>);
        }
        return <>
            <h2>Event log</h2>
            <div id="event-log">
                {reversedEvents}
            </div>
        </>;
    };

    return <>
        <h1><span className="rainbow">Spam</span></h1>
        <div>

            <div className="tight">
                <p>Status: <StatusSpan status={spammer.current.status} /></p>
                <p>Current epoch: {isLoading ? "loading... " : counters.epoch}</p>
                <Balances />
            </div>

            <div className="tight">
                <p>Current RPC:</p>
                <p className="break-word">{spammer.current.getSpamClient().rpcUrl}</p>
            </div>

            <TopUp />

            <SpamOrStopButton />

            {hasCounters && <>
                <br/><br/>
                <h2>Your counters</h2>
                <div className="counter-cards">
                    {counters.current &&
                        <CounterCard type="current" counter={counters.current} />
                    }
                    {counters.register &&
                        <CounterCard type="register" counter={counters.register} />
                    }
                    {counters.claim.map(counter =>
                        <CounterCard type="claim" counter={counter} key={counter.id} />
                    )}
                    {counters.delete.map(counter =>
                        <CounterCard type="delete" counter={counter} key={counter.id} />
                    )}
                </div>
            </>}

            <EventLog />
        </div>
    </>;
};
