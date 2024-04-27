import { UserCounter } from "@polymedia/spam-sdk";
import { formatNumber } from "@polymedia/suits";
import { LinkToExplorerObj } from "@polymedia/webutils";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { StatusSpan } from "./components/StatusSpan";

export const PageSpam: React.FC = () =>
{
    /* State */

    const { balances, spammer, spamView } = useOutletContext<AppContext>();

    const isLoading = spamView.counters.epoch === -1 || balances.sui === -1;

    /* Functions */

    const start = () => {
        if (spammer.status === "stopped") {
            spammer.start();
        }
    };

    const stop = () => {
        if (spammer.status === "running") {
            spammer.stop();
        }
    };

    /* HTML */

    const counters = spamView.counters;
    const hasCounters = Boolean(
        counters.current || counters.register || counters.claim.length || counters.delete.length
    );
    const isLowSuiBalance = balances.sui < 0.001025;

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
        if (isLoading || !isLowSuiBalance) {
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
        if (isLoading || isLowSuiBalance) {
            return null;
        }
        if (spamView.status === "stopped") {
            return <button className="btn" onClick={start}>SPAM</button>;
        }
        if (spamView.status === "running") {
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
        let status: string;
        if (type === "current") {
            status = spamView.status === "running" ? "spamming" : "ready to spam";
        }
        else if (type === "register") {
            status = !counter.registered ? "ready to register" : "claim on next epoch";
        }
        else if (type === "claim") {
            status = "ready to claim";
        }
        else {
            status = "unusable, will be deleted";
        }
        return <div className={`counter-card ${type}`}>
            <div>
                <div className="counter-epoch">
                    Epoch {counter.epoch}
                </div>
                <div>
                    <LinkToExplorerObj network={spammer.getSpamClient().network} objId={counter.id} />
                </div>
            </div>

            <div>
                <div>
                    {counter.tx_count} txs
                </div>
                <div>
                    {counter.registered ? "Registered" : "Not registered"}
                </div>
            </div>

            <div>
                <div>
                    Status: {status}
                </div>
            </div>
        </div>;
    };

    const EventLog: React.FC = () => {
        if (spamView.events.length === 0) {
            return null;
        }
        const reversedEvents = [];
        for (let i = spamView.events.length - 1; i >= 0; i--) {
            reversedEvents.push(<p key={i}>{spamView.events[i]}</p>);
        }
        return <>
            <h2>Event log</h2>
            <div className="tight">
                {reversedEvents}
            </div>
        </>;
    }

    return <>
        <h1><span className="rainbow">Spam</span></h1>
        <div>

            <div className="tight">
                <p>Status: <StatusSpan status={spamView.status} /></p>
                <p>Current epoch: {isLoading ? "loading... " : counters.epoch}</p>
                <Balances />
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
