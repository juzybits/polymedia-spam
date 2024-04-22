import { SpamEventHandler, UserCounter, UserData } from "@polymedia/spam-sdk";
import { formatNumber } from "@polymedia/suits";
import { LinkToExplorerObj } from "@polymedia/webutils";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

type SpamView = {
    status: string;
    lastMessage: string;
    epoch: number;
    userData: UserData;
};

export const PageSpam: React.FC = () =>
{
    /* State */

    const { spamClient } = useOutletContext<AppContext>();
    const [ spamView, setSpamView ] = useState<SpamView>();
    // const [ error, setError ] = useState<string|null>(null);

    const isBootingUp = !spamView;

    /* Functions */

    useEffect(() =>
    {
        /* repaint periodically when the SpamClient is not running */

        const updateView = async () => {
            if (spamClient.status === "running") {
                return;
            }
            const data = await spamClient.fetchData();
            setSpamView(oldView => ({
                status: spamClient.status,
                lastMessage: oldView?.lastMessage ?? "-",
                epoch: data.epoch,
                userData: data.userData,
            }));
        };
        updateView();

        const updateViewPeriodically = setInterval(
            updateView,
            spamClient.network === "localnet" ? 5_000 : 30_000,
        );

        /* repaint on demand whenever there is a SpamClient event */

        const handleEvent: SpamEventHandler = (e) => {
            setSpamView(oldView => ({
                status: spamClient.status,
                lastMessage: (e.type !== "debug" && e.msg) || oldView?.lastMessage || "-",
                epoch: spamClient.epoch,
                userData: spamClient.userData,
            }));
        };
        spamClient.addEventHandler(handleEvent);

        /* clean up on component unmount */

        return () => {
            clearInterval(updateViewPeriodically);
            spamClient.removeEventHandler(handleEvent);
        };
    }, [spamClient]);

    const start = () => {
        if (spamClient.status === "stopped") {
            spamView && (spamView.lastMessage = "Starting");
            spamClient.start();
        }
    };

    const stop = () => {
        if (spamClient.status === "running") {
            spamClient.stop();
        }
    };

    /* HTML */

    const CounterSection: React.FC<{
        title: string;
        counters: UserCounter[];
    }> = ({
        title,
        counters
    }) => (
        <div>
            <h3>{title}</h3>
            {counters.map(counter => (
                <p key={counter.id}>
                    id: <LinkToExplorerObj network={spamClient.network} objId={counter.id} /><br/>
                    epoch: {counter.epoch}<br/>
                    tx_count: {counter.tx_count}<br/>
                    registered: {counter.registered ? "true" : "false"}<br/>
                </p>
            ))}
            {counters.length === 0 &&
            <p>None</p>
            }
        </div>
    );

    const balances = spamView?.userData.balances;
    const counters = spamView?.userData.counters;

    return <>
        <h1>Spam</h1>
        <div>
            {/* <ErrorBox err={error} /> */}
            <div className="">
                <p style={{textTransform: "capitalize"}}>Status:<br/>{spamView?.status}</p>
                <p>Last event:<br/>{spamView?.lastMessage}</p>
                {balances && <>
                <p>Your balances:<br/>
                    {formatNumber(balances.sui, "compact")} SUI&nbsp;&nbsp;|&nbsp;&nbsp;
                    {formatNumber(balances.spam, "compact")} SPAM
                </p>
                </>}
                <p>Current epoch:<br/>{spamView?.epoch}</p>
            </div>
            {isBootingUp
            ? <p>Loading...</p>
            : <>
                <button className="btn" onClick={start}>SPAM</button>
                <button className="btn" onClick={stop}>STOP</button>
            </>
            }
            {counters &&
            <>
                <CounterSection title="Current counter" counters={counters.current ? [counters.current] : []} />
                <CounterSection title="Registered counters" counters={counters.register ? [counters.register] : []} />
                <CounterSection title="Claimable counters" counters={counters.claim} />
                <CounterSection title="Deletable counters" counters={counters.delete} />
            </>}
        </div>
    </>;
};
