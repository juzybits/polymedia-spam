import { useSuiClient } from "@mysten/dapp-kit";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { SpamClient, UserCounter } from "@polymedia/spam-sdk";
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ErrorBox } from "./components/ErrorBox";

type Status =
    "booting up" |
    "loading key pair" |
    "fetching counters" |
    "ready to spam" |
    "fetching epoch" |
    "processing counters" |
    "claiming counters" |
    "registering counters" |
    "destroying duplicate counters" |
    "creating counter" |
    "spamming";

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
    const [ status, setStatus ] = useState<Status>("booting up");
    const [ error, setError ] = useState<string|null>(null);

    const isLoading = !spamClient || !counters;

    /* Functions */

    useEffect(() => {
        const initialize = async () =>
        {
            if (!wallet) {
                navigate("/user");
                return;
            }

            try {
                setStatus("loading key pair");
                const parsedPair = decodeSuiPrivateKey(wallet.secretKey);
                const keypair = Ed25519Keypair.fromSecretKey(parsedPair.secretKey);
                const spamClient = new SpamClient(keypair, suiClient, network);
                setSpamClient(spamClient);

                setStatus("fetching epoch");
                const suiState = await suiClient.getLatestSuiSystemState();
                const currEpoch = Number(suiState.epoch);

                setStatus("fetching counters");
                const countersArray = await spamClient.fetchUserCounters(
                    keypair.toSuiAddress(),
                );

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
            } catch(err) {
                setError(String(err));
            }
        };
        initialize();
    }, [wallet]);

    const spam = async() => { // TODO handle duplicates
        if (status !== "ready to spam" || isLoading) {
            return;
        }
        try {
            if (counters.claim.length > 0) {
                setStatus("claiming counters"); // TODO
            }

            if (counters.register.length > 0) {
                setStatus("registering counters"); // TODO
            }

            if (counters.current.length === 0) {
                setStatus("creating counter");
                const resp = await spamClient.newUserCounter();
                console.debug("newUserCounter resp: ", resp); // TODO setCounters(), etc
            }

            setStatus("spamming"); // TODO

            setStatus("ready to spam");
        } catch(err) {
            setError(String(err));
        }
    };

    /* HTML */

    return <div id="page-content" >
        <h1>Spam</h1>
        <div>
            <ErrorBox err={error} />
            <p>Status: {status}</p>
            {isLoading
            ? <p>Loading...</p>
            : <>
                <p>Current counters: {counters.current.length}</p>
                <p>Register counters: {counters.register.length}</p>
                <p>Claim counters: {counters.claim.length}</p>
            </>
            }
            <button className="btn" onClick={spam}>SPAM</button>
        </div>
    </div>;
}
