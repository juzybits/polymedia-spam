import { useSuiClient } from "@mysten/dapp-kit";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { SpamClient, SpamError, UserCounter, UserCounters, parseSpamError } from "@polymedia/spam-sdk";
import { sleep } from "@polymedia/suits";
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
                setInfo("booting up");
                await reload(false);
                setInfo("ready to spam");
            })();
        }
    }, [wallet]);

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
                    setInfo("ready to spam");
                    return;
                }

                if (counters.claim.length > 0) {
                    setInfo("claiming user counters"); // TODO
                }

                if (counters.register.length > 0) {
                    setInfo("registering user counters"); // TODO
                }

                setInfo("destroying duplicate user counters"); // TODO

                if (counters.current.length === 0) {
                    setInfo("creating user counter");
                    const resp = await spamClient.newUserCounter();
                    console.debug("newUserCounter resp: ", resp);
                    status.current = "stopped";
                    reload(true);
                    return;
                }

                setInfo("spamming");

                const currUserCounter = counters.current[0];
                console.debug("currUserCounterId:", currUserCounter.id);
                const resp = await spamClient.incrementUserCounter(currUserCounter.id)
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
                setInfo("ready to spam");
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
                    registered: {counter.registered}<br />
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
                <CounterSection title="Current counters" counters={counters.current} />
                <CounterSection title="Register counters" counters={counters.register} />
                <CounterSection title="Claim counters" counters={counters.claim} />
            </>}
        </div>
    </div>;
}
