import { useSuiClient } from "@mysten/dapp-kit";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { SPAM_IDS, UserCounter, fetchUserCounters } from "@polymedia/spam-sdk";
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageSpam: React.FC = () =>
{
    /* State */

    const navigate = useNavigate();
    const suiClient = useSuiClient();
    const { network, wallet } = useOutletContext<AppContext>();
    const [ pair, setPair ] = useState<Ed25519Keypair|null>(null);
    const [ counters, setCounters ] = useState<UserCounter[]>();

    const spamIds = SPAM_IDS[network];

    /* Functions */

    useEffect(() => {
        const initialize = async () =>
        {
            if (!wallet) {
                navigate("/user");
                return;
            }

            const parsedPair = decodeSuiPrivateKey(wallet.secretKey);
            const newPair = Ed25519Keypair.fromSecretKey(parsedPair.secretKey);
            setPair(newPair);

            const newCounters = await fetchUserCounters(
                suiClient,
                spamIds.packageId,
                newPair.toSuiAddress(),
            );
            setCounters(newCounters);
        };
        initialize();
    }, [wallet]);

    /* HTML */

    const isLoading = !pair || !counters;

    let content;
    if (isLoading) {
        content = <p>Loading...</p>;
    } else {
        content = <p>
            Counters: {counters.length}
        </p>;
    }

    return <div id="page-content" >
        <h1>Spam</h1>
        {content}
    </div>;
}
