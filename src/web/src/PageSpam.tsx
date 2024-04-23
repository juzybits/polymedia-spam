import { UserCounter } from "@polymedia/spam-sdk";
import { formatNumber } from "@polymedia/suits";
import { LinkToExplorerObj } from "@polymedia/webutils";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageSpam: React.FC = () =>
{
    /* State */

    const { balances, spammer, spamView } = useOutletContext<AppContext>();
    // const [ error, setError ] = useState<string|null>(null);

    const isBootingUp = spamView.counters.epoch === -1;

    /* Functions */

    const start = () => {
        if (spammer.status === "stopped") {
            spamView && (spamView.lastMessage = "Starting");
            spammer.start();
        }
    };

    const stop = () => {
        if (spammer.status === "running") {
            spammer.stop();
        }
    };

    /* HTML */

    const counters = spamView?.counters;
    const isLowSuiBalance = !balances || balances.sui < 0.001025;

    const Balances: React.FC = () => {
        if (!balances) {
            return null;
        }
        return <>
            <p>Your balances:<br/>
                {formatNumber(balances.sui, "compact")} SUI<br/>
                {formatNumber(balances.spam, "compact")} SPAM
            </p>
        </>;
    };

    const TopUp: React.FC = () => {
        if (!isLowSuiBalance) {
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
        if (isBootingUp || isLowSuiBalance) {
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

    const CounterSection: React.FC<{
        title: string;
        counters: UserCounter[];
    }> = ({
        title,
        counters
    }) => {
        if (counters.length === 0) {
            return null;
        }
        return <div>
            <h3>{title}</h3>
            {counters.map(counter => (
                <p key={counter.id}>
                    id: <LinkToExplorerObj network={spammer.client.network} objId={counter.id} /><br/>
                    epoch: {counter.epoch}<br/>
                    tx_count: {counter.tx_count}<br/>
                    registered: {counter.registered ? "true" : "false"}<br/>
                </p>
            ))}
            {counters.length === 0 &&
            <p>None</p>
            }
        </div>;
    };

    return <>
        <h1>Spam</h1>
        <div>

            {/* <ErrorBox err={error} /> */}

            <p style={{textTransform: "capitalize"}}>Status:<br/>{spamView?.status}</p>

            <Balances />

            <TopUp />

            <SpamOrStopButton />

            {/* <p>Current epoch: {view?.epoch}</p> */}
            {counters &&
            <>
                <CounterSection title="Current counter" counters={counters.current ? [counters.current] : []} />
                <CounterSection title="Registered counters" counters={counters.register ? [counters.register] : []} />
                <CounterSection title="Claimable counters" counters={counters.claim} />
                <CounterSection title="Deletable counters" counters={counters.delete} />
            </>}

            <h3>Event log</h3> {/* TODO */}
            <textarea defaultValue={spamView?.lastMessage} />
        </div>
    </>;
};
