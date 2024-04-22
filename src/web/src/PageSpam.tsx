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

    const { spammer } = useOutletContext<AppContext>();
    const [ view, setView ] = useState<SpamView>();
    // const [ error, setError ] = useState<string|null>(null);

    const isBootingUp = !view;

    /* Functions */

    useEffect(() =>
    {
        /* repaint periodically when the Spammer is not running */

        const updateView = async () => {
            if (spammer.status === "running") {
                return;
            }
            const data = await spammer.client.fetchUserData();
            setView(oldView => ({
                status: spammer.status,
                lastMessage: oldView?.lastMessage ?? "-",
                epoch: data.epoch,
                userData: data.userData,
            }));
        };
        updateView();

        const updateViewPeriodically = setInterval(
            updateView,
            spammer.client.network === "localnet" ? 5_000 : 30_000,
        );

        /* repaint on demand whenever there is a Spammer event */

        const handleEvent: SpamEventHandler = (e) => {
            setView(oldView => ({
                status: spammer.status,
                lastMessage: (e.type !== "debug" && e.msg) || oldView?.lastMessage || "-",
                epoch: spammer.epoch,
                userData: spammer.userData,
            }));
        };
        spammer.addEventHandler(handleEvent);

        /* clean up on component unmount */

        return () => {
            clearInterval(updateViewPeriodically);
            spammer.removeEventHandler(handleEvent);
        };
    }, [spammer]);

    const start = () => {
        if (spammer.status === "stopped") {
            view && (view.lastMessage = "Starting");
            spammer.start();
        }
    };

    const stop = () => {
        if (spammer.status === "running") {
            spammer.stop();
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
                    id: <LinkToExplorerObj network={spammer.client.network} objId={counter.id} /><br/>
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

    const balances = view?.userData.balances;
    const counters = view?.userData.counters;

    return <>
        <h1>Spam</h1>
        <div>
            {/* <ErrorBox err={error} /> */}
            <div className="">
                <p style={{textTransform: "capitalize"}}>Status:<br/>{view?.status}</p>
                <p>Last event:<br/>{view?.lastMessage}</p>
                {balances && <>
                <p>Your balances:<br/>
                    {formatNumber(balances.sui, "compact")} SUI&nbsp;&nbsp;|&nbsp;&nbsp;
                    {formatNumber(balances.spam, "compact")} SPAM
                </p>
                </>}
                <p>Current epoch:<br/>{view?.epoch}</p>
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
