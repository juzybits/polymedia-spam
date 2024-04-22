import { SpamEventHandler, UserCounter, UserData } from "@polymedia/spam-sdk";
import { formatNumber } from "@polymedia/suits";
import { LinkToExplorerObj } from "@polymedia/webutils";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ErrorBox } from "./components/ErrorBox";

type SpamView = {
    status: string;
    epoch: number;
    userData: UserData;
};

export const PageSpam: React.FC = () =>
{
    /* State */

    const { spamClient } = useOutletContext<AppContext>();
    const [ spamView, setSpamView ] = useState<SpamView>();
    const [ info, setInfo ] = useState<string>("booting up");
    const [ error, setError ] = useState<string|null>(null);

    const isBootingUp = !spamView;

    /* Functions */

    useEffect(() => {
        const initialize = async () => {
            try {
                await spamClient.refreshData();
                setInfo("ready to spam");
            }
            catch(err) {
                setError(String(err));
            }
        };
        initialize();

        const refreshData = setInterval(() => {
            spamClient.refreshData();
        }, spamClient.network === "localnet" ? 5_000 : 20_000);

        const handlerEvent: SpamEventHandler = (evt) => {
            if (evt.type !== "debug") {
                setInfo(evt.msg);
            }
            setSpamView({
                status: spamClient.status,
                epoch: spamClient.epoch,
                userData: spamClient.userData,
            });
        };
        spamClient.addEventHandler(handlerEvent);

        return () => {
            clearInterval(refreshData);
            spamClient.removeEventHandler(handlerEvent);
        };
    }, [spamClient]);

    const start = () => {
        spamClient.start();
    };

    const stop = () => {
        spamClient.stop();
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
                    id: <LinkToExplorerObj network={spamClient.network} objId={counter.id} /><br />
                    epoch: {counter.epoch}<br />
                    tx_count: {counter.tx_count}<br />
                    registered: {counter.registered ? "true" : "false"}<br />
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
            <ErrorBox err={error} />
            <div className="tight">
                <p>Status: {spamView?.status}</p>
                <p>Info: {info}</p>
                <p>Epoch: {spamView?.epoch}</p>
                {balances && <>
                <p>Your balances:</p>
                <p>{formatNumber(balances.spam, "compact")} SPAM</p>
                <p>{formatNumber(balances.sui, "compact")} SUI</p>
                </>}
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
