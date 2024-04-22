import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageUser: React.FC = () =>
{
    const { replaceKeypair, spammer } = useOutletContext<AppContext>();

    const onCreateWallet = () => {
        replaceKeypair(new Ed25519Keypair());
    };

    return <>
        <h1>User</h1>
        <p>Your address is: {spammer.client.signer.toSuiAddress()}</p>
        <div className="btn-group">
            <button className="btn" onClick={onCreateWallet}>CREATE WALLET</button>
            <button className="btn">IMPORT WALLET</button> {/* TODO */}
        </div>
    </>;
};
