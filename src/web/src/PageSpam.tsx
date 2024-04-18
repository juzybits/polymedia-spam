import { useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { useEffect, useState } from "react";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";

export const PageSpam: React.FC = () =>
{
    const navigate = useNavigate();
    const { wallet } = useOutletContext<AppContext>();
    const [ pair, setPair ] = useState<Ed25519Keypair|null>(null);

    useEffect(() => {
        if (!wallet) {
            navigate("/user")
        } else {
            const parsedPair = decodeSuiPrivateKey(wallet.secretKey);
            setPair(Ed25519Keypair.fromSecretKey(parsedPair.secretKey));
        }
    }, [wallet])

    return <div id="page-content" >
        <h1>Spam</h1>
        Ready to spam
    </div>;
}
