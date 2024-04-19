import { useSuiClient } from "@mysten/dapp-kit";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { SPAM_IDS, UserCounter, fetchUserCounters } from "@polymedia/spam-sdk";
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { ErrorBox } from "./components/ErrorBox";

export const PageSpam: React.FC = () =>
{
    /* State */

    const navigate = useNavigate();
    const suiClient = useSuiClient();
    const { network, wallet } = useOutletContext<AppContext>();
    const [ pair, setPair ] = useState<Ed25519Keypair|null>(null);
    const [ counters, setCounters ] = useState<UserCounter[]>();
    const [ isRunning, setIsRunning ] = useState<boolean>(false);
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
                const parsedPair = decodeSuiPrivateKey(wallet.secretKey);
                const newPair = Ed25519Keypair.fromSecretKey(parsedPair.secretKey);
                setPair(newPair);

                const newCounters = await fetchUserCounters(
                    suiClient,
                    spamIds.packageId,
                    newPair.toSuiAddress(),
                );
                setCounters(newCounters);
            } catch(err) {
                setError(String(err));
            }
        };
        initialize();
    }, [wallet]);

    const spam = async() => {
        if (isRunning || isLoading) {
            return;
        }
        setIsRunning(true);
        try {
            const suiState = await suiClient.getLatestSuiSystemState();
            const currEpoch = Number(suiState.epoch);

            let currCounter: UserCounter|null;
            let registerCounters: UserCounter[]= [];
            let claimCounters: UserCounter[] = [];

            for (const counter of counters) {
                if (counter.epoch === currEpoch) {
                    currCounter = counter;
                } else if (counter.epoch == currEpoch - 1) {
                    registerCounters.push(counter);
                } else if (counter.epoch <= currEpoch - 2) {
                    claimCounters.push(counter);
                } else {
                    throw new Error("UserCounter.epoch is newer than network epoch");
                }
            }

            for (const counter of claimCounters) {
                // TODO claim()
            }

            for (const counter of registerCounters) {
                // TODO register()
            }

            const spamAmount = 5; // TODO make infinite
            for (let i = 0; i < spamAmount; i++) {
                // TODO increment_user_counter()
            }
        } catch(err) {
            setError(String(err));
        } finally {
            setIsRunning(false);
        }
    };

    /* HTML */

    let content;
    if (error) {
        content = <ErrorBox err={error} />
    } else if (isLoading) {
        content = <p>Loading...</p>;
    } else {
        content = <div>
            <p>Counters: {counters.length}</p>
            <button className="btn" onClick={spam}>SPAM</button>
        </div>;
    }

    return <div id="page-content" >
        <h1>Spam</h1>
        {content}
    </div>;
}
