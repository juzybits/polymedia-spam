import { useSuiClient } from "@mysten/dapp-kit";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { SpamClient, SpamError, UserCounter, UserData, parseSpamError } from "@polymedia/spam-sdk";
import { shortenSuiAddress, sleep } from "@polymedia/suits";
import { LinkToExplorerObj, isLocalhost } from "@polymedia/webutils";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ErrorBox } from "./components/ErrorBox";
import { Wallet } from "./lib/storage";

type Status = "stopped" | "running" | "stop requested";

export const PageSpam: React.FC = () =>
{
    /* State */

    const navigate = useNavigate();

    const suiClient = useSuiClient();

    const { network, wallet } = useOutletContext<AppContext>();

    const [ spamClient, setSpamClient ] = useState<SpamClient>();
    const [ userData, setUserData ] = useState<UserData>();
    const status = useRef<Status>("stopped");
    const [ info, setInfo ] = useState<string>("booting up");
    const [ error, setError ] = useState<string|null>(null);

    const isBootingUp = !spamClient || !userData;

    /* Functions */

    useEffect(() => {
        if (!wallet) {
            navigate("/user");
            return;
        }
        const initialize = async (wallet: Wallet) => {
            const loadUserKeypair = (wallet: Wallet): Ed25519Keypair => {
                const parsedPair = decodeSuiPrivateKey(wallet.secretKey);
                const keypair = Ed25519Keypair.fromSecretKey(parsedPair.secretKey);
                return keypair;
            };
            const loadSpamClient = (wallet: Wallet): SpamClient => {
                const keypair = loadUserKeypair(wallet);
                const spamClient = new SpamClient(keypair, suiClient, network);
                setSpamClient(spamClient);
                return spamClient;
            };
            try {
                showInfo("booting up");
                const spamClient = loadSpamClient(wallet);
                await loadUserData(spamClient);
                showInfo("ready to spam");
            }
            catch(err) {
                setError(String(err));
            }
        };
        initialize(wallet);
    }, [wallet]);

    const showInfo = (msg: string) => {
        setInfo(msg);
        console.info(msg);
    };

    const loadUserData = async (spamClient: SpamClient): Promise<UserData> => {
        // fetch user balance TODO

        // fetch user counters
        const userData = await spamClient.fetchUserData();
        setUserData(userData);
        return userData;
    }

    const loadUserDataAndStart = async (spamClient: SpamClient) => {
        const userData = await loadUserData(spamClient);
        spam(userData);
    }

    const spam = async(
        userData: UserData,
    ) => {
        if (isBootingUp || status.current !== "stopped") {
            showInfo("Can't spam now. Status: " + status.current);
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

                if (userData.register !== null && !userData.register.registered) {
                    showInfo("registering counter: " + shortenSuiAddress(userData.register.id));
                    const resp = await spamClient.registerUserCounter(userData.register.id);
                    userData.register.registered = true;
                    console.debug("registerUserCounter resp: ", resp);
                }

                if (userData.claim.length > 0) {
                    showInfo("claiming counters: " + userData.claim.map(c => shortenSuiAddress(c.id)).join(", "));
                    const counterIds = userData.claim.map(counter => counter.id);
                    const resp = await spamClient.claimUserCounters(counterIds);
                    userData.claim = [];
                    console.debug("destroyUserCounters resp: ", resp);
                }

                if (userData.delete.length > 0) {
                    showInfo("deleting counters: " + userData.delete.map(c => shortenSuiAddress(c.id)).join(", "));
                    const counterIds = userData.delete.map(counter => counter.id);
                    const resp = await spamClient.destroyUserCounters(counterIds);
                    userData.delete = [];
                    console.debug("destroyUserCounters resp: ", resp);
                }

                if (userData.current === null) {
                    showInfo("creating counter");
                    const resp = await spamClient.newUserCounter();
                    console.debug("newUserCounter resp: ", resp);
                    status.current = "stopped";
                    loadUserDataAndStart(spamClient);
                    return;
                }

                showInfo("spamming");

                network == "localnet" && isLocalhost() && await sleep(333); // simulate latency
                const resp = await spamClient.incrementUserCounter(userData.current.id)
                console.debug("incrementUserCounter resp: ", resp);
                loadUserData(spamClient); // TODO do periodically, outside of this loop
            }
        }
        catch(err) {
            status.current = "stopped";
            const errStr = String(err);
            const errCode = parseSpamError(errStr);
            if (errCode === SpamError.EWrongEpoch) {
                loadUserDataAndStart(spamClient);
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
            {counters.length === 0 &&
            <p>None</p>
            }
        </div>
    );

    return <div id="page-content" >
        <h1>Spam</h1>
        <div>
            <ErrorBox err={error} />
            <div className="tight">
                <p>Status: {status.current}</p>
                <p>Info: {info}</p>
                <p>Epoch: {userData?.epoch}</p>
            </div>
            {isBootingUp
            ? <p>Loading...</p>
            : <>
                <button className="btn" onClick={() => loadUserDataAndStart(spamClient)}>SPAM</button>
                <button className="btn" onClick={() => status.current = "stop requested"}>STOP</button>
            </>
            }
            {userData &&
            <>
                <CounterSection title="Current counter" counters={userData.current ? [userData.current] : []} />
                <CounterSection title="Registered counters" counters={userData.register ? [userData.register] : []} />
                <CounterSection title="Claimable counters" counters={userData.claim} />
                <CounterSection title="Deletable counters" counters={userData.delete} />
            </>}
        </div>
    </div>;
}
