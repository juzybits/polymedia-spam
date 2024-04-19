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
    "creating counter" |
    "spamming";

export const PageSpam: React.FC = () =>
{
    /* State */

    const navigate = useNavigate();

    const suiClient = useSuiClient();

    const { network, wallet } = useOutletContext<AppContext>();

    const [ spamClient, setSpamClient ] = useState<SpamClient>();
    const [ counters, setCounters ] = useState<UserCounter[]>();
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

                setStatus("fetching counters");
                const newCounters = await spamClient.fetchUserCounters(
                    keypair.toSuiAddress(),
                );
                setCounters(newCounters);

                setStatus("ready to spam");
            } catch(err) {
                setError(String(err));
            }
        };
        initialize();
    }, [wallet]);

    const spam = async() => {
        if (status !== "ready to spam" || isLoading) {
            return;
        }
        try {
            setStatus("fetching epoch");
            const suiState = await suiClient.getLatestSuiSystemState();
            const currEpoch = Number(suiState.epoch);

            setStatus("processing counters")
            const currCounters: UserCounter[]= [];
            const registerCounters: UserCounter[]= [];
            const claimCounters: UserCounter[] = [];

            for (const counter of counters) {
                if (counter.epoch === currEpoch) {
                    currCounters.push(counter);
                } else if (counter.epoch == currEpoch - 1) {
                    registerCounters.push(counter);
                } else if (counter.epoch <= currEpoch - 2) {
                    claimCounters.push(counter);
                } else {
                    throw new Error("UserCounter.epoch is newer than network epoch");
                }
            }

            claimCounters.length && setStatus("claiming counters")
            for (const counter of claimCounters) {
                // TODO claim()
            }

            registerCounters.length && setStatus("registering counters")
            for (const counter of registerCounters) {
                // TODO register()
            }

            if (currCounters.length === 0) {
                setStatus("creating counter");
                const resp = await spamClient.newUserCounter(); // TODO setCounters()
                console.debug("resp: ", resp);
            }

            setStatus("spamming")
            const spamAmount = 5; // TODO make infinite
            for (let i = 0; i < spamAmount; i++) {
                i**i/i;
                // TODO increment_user_counter()
            }
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
            : <p>Counters: {counters.length}</p>
            }
            <button className="btn" onClick={spam}>SPAM</button>
        </div>
    </div>;
}
