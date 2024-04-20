import { useSuiClient } from "@mysten/dapp-kit";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { SpamClient, SpamError, UserCounter, parseSpamError } from "@polymedia/spam-sdk";
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ErrorBox } from "./components/ErrorBox";
import { LinkToExplorerObj } from "@polymedia/webutils";
import { sleep } from "@polymedia/suits";

type UserCounters = {
    current: UserCounter[],
    register: UserCounter[],
    claim: UserCounter[],
}

export const PageSpam: React.FC = () =>
{
    /* State */

    const navigate = useNavigate();

    const suiClient = useSuiClient();

    const { network, wallet } = useOutletContext<AppContext>();

    const [ spamClient, setSpamClient ] = useState<SpamClient>();
    const [ counters, setCounters ] = useState<UserCounters>();
    const [ status, setStatus ] = useState<string>("booting up");
    const [ error, setError ] = useState<string|null>(null);

    const isLoading = !spamClient || !counters || status !== "ready to spam";

    /* Functions */

    useEffect(() => {
        if (!wallet) {
            navigate("/user");
        } else {
            reload(false);
        }
    }, [wallet]);

    const reload = async (start: boolean) => {
        if (!wallet) {
            return;
        }
        try {
            setStatus("loading user key pair");
            const parsedPair = decodeSuiPrivateKey(wallet.secretKey);
            const keypair = Ed25519Keypair.fromSecretKey(parsedPair.secretKey);
            const spamClient = new SpamClient(keypair, suiClient, network);
            setSpamClient(spamClient);

            setStatus("fetching user balance"); // TODO

            setStatus("fetching Sui epoch");
            const suiState = await suiClient.getLatestSuiSystemState();
            const currEpoch = Number(suiState.epoch);

            setStatus("fetching user counters");
            const countersArray = await spamClient.fetchUserCounters();

            const userCounters: UserCounters =  {
                current: [],
                register: [],
                claim: [],
            };

            for (const counter of countersArray) {
                if (counter.epoch === currEpoch) {
                    userCounters.current.push(counter);
                }
                else if (counter.epoch == currEpoch - 1) {
                    userCounters.register.push(counter);
                }
                else if (counter.epoch <= currEpoch - 2) {
                    userCounters.claim.push(counter);
                }
                else {
                    throw new Error("UserCounter.epoch is newer than network epoch");
                }
            }
            setCounters(userCounters);
            setStatus("ready to spam");
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
        if (isLoading) {
            return;
        }
        try {
            while (true) {
                if (counters.claim.length > 0) {
                    setStatus("claiming user counters"); // TODO
                }

                if (counters.register.length > 0) {
                    setStatus("registering user counters"); // TODO
                }

                setStatus("destroying duplicate user counters"); // TODO

                setStatus("ready to spam");

                if (counters.current.length === 0) {
                    setStatus("creating user counter");
                    const resp = await spamClient.newUserCounter();
                    console.debug("newUserCounter resp: ", resp);
                    await reload(true);
                    return;
                }

                let currUserCounter = counters.current[0];
                console.debug("currUserCounterId:", currUserCounter.id);
                const resp = await spamClient.incrementUserCounter(currUserCounter.id)
                currUserCounter.tx_count += 1; // hack for now
                console.debug("incrementUserCounter resp: ", resp);
                await sleep(1000);
                reload(false);
            }
        } catch(err) {
            const errStr = String(err);
            const errCode = parseSpamError(errStr);
            if (errCode === SpamError.EWrongEpoch) {
                await reload(true);
            } else {
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
            <p>Status: {status}</p>
            {isLoading
            ? <p>Loading...</p>
            : <>
                <button className="btn" onClick={() => reload(true)}>SPAM</button>
                <CounterSection title="Current counters" counters={counters.current} />
                <CounterSection title="Register counters" counters={counters.register} />
                <CounterSection title="Claim counters" counters={counters.claim} />
            </>
            }
        </div>
    </div>;
}
