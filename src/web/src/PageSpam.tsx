import { useSuiClient } from "@mysten/dapp-kit";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { SPAM_IDS, UserCounter, fetchUserCounters } from "@polymedia/spam-sdk";
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
    const [ pair, setPair ] = useState<Ed25519Keypair|null>(null);
    const [ counters, setCounters ] = useState<UserCounter[]>();
    const [ status, setStatus ] = useState<Status>("booting up");
    const [ error, setError ] = useState<string|null>(null);

    const spamIds = SPAM_IDS[network];
    const isLoading = !pair || !counters;

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
                const newPair = Ed25519Keypair.fromSecretKey(parsedPair.secretKey);
                setPair(newPair);

                setStatus("fetching counters");
                const newCounters = await fetchUserCounters(
                    suiClient,
                    spamIds.packageId,
                    newPair.toSuiAddress(),
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
            let currCounter: UserCounter|null = null;
            let registerCounters: UserCounter[]= [];
            let claimCounters: UserCounter[] = [];

            for (const counter of counters) {
                if (counter.epoch === currEpoch) {
                } else if (counter.epoch == currEpoch - 1) {
                    currCounter = counter;
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

            !currCounter && setStatus("creating counter");

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
