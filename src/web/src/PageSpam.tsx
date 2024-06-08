import { UserCounter } from "@polymedia/spam-sdk";
import { formatNumber, shortenSuiAddress } from "@polymedia/suitcase-core";
import { LinkToPolymedia } from "@polymedia/suitcase-react";
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { PageDisclaimer } from "./PageDisclaimer";
import { StatusSpan } from "./components/StatusSpan";
import { EpochData, formatEpochPeriod, getEpochTimes } from "./lib/epochs";

export const PageSpam: React.FC = () =>
{
    /* State */

    const { network, balances, spammer, spamView, disclaimerAccepted } = useOutletContext<AppContext>();
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

    const startLoop = () => {
        if (spammer.current.status === "stopped") {
            spammer.current.start(true);
        }
    };

    const startOnce = () => {
        if (spammer.current.status === "stopped") {
            spammer.current.start(false);
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

    if (!disclaimerAccepted) {
        return <PageDisclaimer />;
    }

    const isLowSuiBalance = balances.sui < 0.003;

    const counters = spamView.counters;
    const hasCounters = Boolean(
        counters.current || counters.register || counters.claim.length > 0 || counters.delete.length > 0
    );

    let showProcessCountersButton = false;
    const actionableCounters: string[] = [];
    if (hasCounters && spammer.current.status === "stopped") {
        if (counters.register?.registered === false) {
            actionableCounters.push("REGISTER");
        }
        if (counters.claim.length > 0) {
            actionableCounters.push("CLAIM");
        }
        if (counters.delete.length > 0) {
            actionableCounters.push("DELETE");
        }
        showProcessCountersButton = actionableCounters.length > 0;
    }

    const Balances: React.FC = () => {
        if (!balances) {
            return null;
        }
        return <>
            <p>SUI balance: {isLoading ? "loading..." : formatNumber(balances.sui, "compact")}</p>
            <p>SPAM balance: {isLoading ? "loading..." : formatNumber(balances.spam, "compact")}</p>
        </>;
    };

    const CurrentRPC: React.FC = () => {
        if (isLoading || isLowSuiBalance || isDisabled) {
            return null;
        }
        return <div className="tight">
            <h2>Current RPC</h2>
            <span className="sui-address">{spammer.current.getSpamClient().rpcUrl}</span>
            <br/><br/>
        </div>;
    };

    const TopUp: React.FC = () => {
        if (isLoading || !isLowSuiBalance || isDisabled) {
            return null;
        }
        let message: React.ReactNode;
        if (counters.register?.registered === false) {
            message = <p className="text-orange">🚨 Send SUI to your wallet to register the counter!</p>;
        } else if (counters.claim.length) {
            message = <p className="text-orange">Send SUI to your wallet to claim the counter{counters.claim.length > 1 ? "s" : ""}</p>;
        } else {
            message = network === "mainnet"
                ? <p className="text-orange">Mining has ended.</p>
                : <p>Top up your wallet to start.</p>;
        }
        return <>
            {message}
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
            return <>
                {network === "mainnet"
                ?
                    <p className="text-orange">Mining has ended.</p>
                :
                    <button className="btn" onClick={startLoop}>SPAM</button>
                }
                {showProcessCountersButton && <>
                    <br/>
                    <button className="btn break-all" onClick={startOnce}>
                        {actionableCounters.join(" + ")} COUNTERS</button>
                </>}
            </>;
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
        let status: React.ReactNode;
        if (type === "current") {
            if (spammer.current.status === "running") {
                status = "Spamming...";
                txClass = "blink";
            } else {
                status = isLowSuiBalance
                    ? "Top up your wallet to spam this counter"
                    : `Ready to spam. Can be registered on epoch ${counter.epoch+1}.`;
                }
        }
        else if (type === "register") {
            if (counter.registered) {
                status = `✅ Registered, can mint SPAM from epoch ${counter.epoch+2}`;
            } else if (spammer.current.status === "running") {
                status = "⏳ Registering counter...";
            } else {
                status = <span className="blink-loop">🚨 MUST BE REGISTERED before epoch {counter.epoch+1} ends</span>;
            }
        }
        else if (type === "claim") {
            if (spammer.current.status === "running") {
                status = "💰 Minting SPAM...";
            } else {
                status = "✅ Can mint SPAM at any time";
            }
        }
        else {
            if (spammer.current.status === "running") {
                status = "🧹 Deleting counter...";
            } else {
                status = "Unusable. Will be deleted.";
            }
        }

        const epochTimes = currEpoch && getEpochTimes(counter.epoch, currEpoch);

        return <div className={`counter-card ${type}`}>
            <div>
                <div className="counter-epoch">
                    Epoch {counter.epoch}
                </div>
                <div>
                    <LinkToPolymedia network={network} kind="object" addr={counter.id} />
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
                    {formatEpochPeriod(epochTimes.startTime, epochTimes.endTime, true)}
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

    const claimAddress = spammer.current.getClaimAddress();
    const signerAddress = spammer.current.getSpamClient().signer.toSuiAddress();
    const claimAddrInfo = claimAddress === signerAddress
        ? <>
            <span>miner address</span>
            <br/>
            <Link to="/wallet#set-claim-address">not recommended</Link>
        </>
        : shortenSuiAddress(claimAddress);
    return <>
        <h1><span className="rainbow">Spam</span></h1>
        <div>

            <div className="tight">
                <p>Status: <StatusSpan status={spammer.current.status} /></p>
                <p>Current epoch: {isLoading ? "loading... " : counters.epoch}</p>
                <Balances />
                <p>Claim address: {claimAddrInfo}</p>
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

            <CurrentRPC />

            <EventLog />
        </div>
    </>;
};
