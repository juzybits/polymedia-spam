import { useSuiClient } from "@mysten/dapp-kit";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { SpamClient, SpamError, UserCounter, UserCounters, parseSpamError } from "@polymedia/spam-sdk";
import { shortenSuiAddress, sleep } from "@polymedia/suits";
import { LinkToExplorerObj } from "@polymedia/webutils";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ErrorBox } from "./components/ErrorBox";

type Status = "stopped" | "running" | "stop requested";

export const PageSpam: React.FC = () =>
{
    /* State */

    const navigate = useNavigate();

    const suiClient = useSuiClient();

    const { network, wallet } = useOutletContext<AppContext>();

    const [ spamClient, setSpamClient ] = useState<SpamClient>();
    const [ counters, setCounters ] = useState<UserCounters>();
    const status = useRef<Status>("stopped");
    const [ info, setInfo ] = useState<string>("booting up");
    const [ error, setError ] = useState<string|null>(null);

    const isBootingUp = !spamClient || !counters;

    /* Functions */

    useEffect(() => {
        if (!wallet) {
            navigate("/user");
        } else {
            (async () => {
                showInfo("booting up");
                await reload(false);
                showInfo("ready to spam");
            })();
        }
    }, [wallet]);

    const showInfo = (msg: string) => {
        setInfo(msg);
        console.info(msg);
    };

    const reload = async (start: boolean) => {
        if (!wallet) {
            return;
        }
        try {
            // load user key pair
            const parsedPair = decodeSuiPrivateKey(wallet.secretKey);
            const keypair = Ed25519Keypair.fromSecretKey(parsedPair.secretKey);
            const spamClient = new SpamClient(keypair, suiClient, network);
            setSpamClient(spamClient);

            // fetch user balance TODO

            // fetch user counters
            const userCounters = await spamClient.fetchUserCounters();
            setCounters(userCounters);

            if (start) {
                spam(userCounters);
            }
        } catch(err) {
            setError(String(err));
        }
    }

    const spam = async(
        counters: UserCounters,
    ) => {
        if (isBootingUp || status.current !== "stopped") {
            console.debug("Can't spam now. Status:", status.current);
            return;
        }
        try {
            status.current = "running";
            while (true)
            {
                // @ts-expect-error "This comparison appears to be unintentional"
                if (status.current === "stop requested") {
                    status.current = "stopped";
                    showInfo("ready to spam");
                    return;
                }

                if (counters.register !== null && !counters.register.registered) {
                    showInfo("registering counter: " + shortenSuiAddress(counters.register.id));
                    const resp = await spamClient.registerUserCounter(counters.register.id);
                    counters.register.registered = true;
                    console.debug("registerUserCounter resp: ", resp);
                }

                if (counters.claim.length > 0) {
                    showInfo("claiming counters: " + counters.claim.map(c => shortenSuiAddress(c.id)).join(", "));
                    const counterIds = counters.claim.map(counter => counter.id);
                    const resp = await spamClient.claimUserCounters(counterIds);
                    counters.claim = [];
                    console.debug("destroyUserCounters resp: ", resp);
                }

                if (counters.delete.length > 0) {
                    showInfo("deleting counters: " + counters.delete.map(c => shortenSuiAddress(c.id)).join(", "));
                    const counterIds = counters.delete.map(counter => counter.id);
                    const resp = await spamClient.destroyUserCounters(counterIds);
                    counters.delete = [];
                    console.debug("destroyUserCounters resp: ", resp);
                }

                if (counters.current === null) {
                    showInfo("creating counter");
                    const resp = await spamClient.newUserCounter();
                    console.debug("newUserCounter resp: ", resp);
                    status.current = "stopped";
                    reload(true);
                    return;
                }

                showInfo("spamming");

                console.debug("counters.current.id:", counters.current.id);
                const resp = await spamClient.incrementUserCounter(counters.current.id)
                console.debug("incrementUserCounter resp: ", resp);
                await sleep(1000);
                reload(false);
            }
        } catch(err) {
            status.current = "stopped";
            const errStr = String(err);
            const errCode = parseSpamError(errStr);
            if (errCode === SpamError.EWrongEpoch) {
                reload(true);
            } else {
                showInfo("ready to spam");
                setError(errStr);
            }
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
                    id: <LinkToExplorerObj network={network} objId={counter.id} /><br />
                    epoch: {counter.epoch}<br />
                    tx_count: {counter.tx_count}<br />
                    registered: {counter.registered ? "true" : "false"}<br />
                </p>
            ))}
        </div>
    );

    return <div id="page-content" >
        <h1>Spam</h1>
        <div>
            <ErrorBox err={error} />
            <p>Status: {status.current}</p>
            <p>Info: {info}</p>
            {isBootingUp
            ? <p>Loading...</p>
            : <>
                <button className="btn" onClick={() => reload(true)}>SPAM</button>
                <button className="btn" onClick={() => status.current = "stop requested"}>STOP</button>
            </>
            }
            {counters &&
            <>
                <CounterSection title="Current counter" counters={counters.current ? [counters.current] : []} />
                <CounterSection title="Register counters" counters={counters.register ? [counters.register] : []} />
                <CounterSection title="Claim counters" counters={counters.claim} />
                <CounterSection title="Delete counters" counters={counters.delete} />
            </>}
        </div>
    </div>;
}
