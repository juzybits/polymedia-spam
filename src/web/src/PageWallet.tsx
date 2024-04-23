import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageWallet: React.FC = () =>
{
    const { replaceKeypair, spammer } = useOutletContext<AppContext>();

    const onCreateWallet = () => {
        const resp = window.confirm(
            "🚨 WARNING 🚨\n\nThis will delete and replace your current wallet.\n\nAre you sure?"
        );
        if (resp) {
            replaceKeypair(new Ed25519Keypair());
        }
    };

    return <>
        <h1>Wallet</h1>

        <p>
            Your public address:<br/>
            <span className="break-all">
                {spammer.client.signer.toSuiAddress()}
            </span>
        </p>
        <p>
            Your secret key:<br/>
            <span className="break-all">
                {(spammer.client.signer as Ed25519Keypair).getSecretKey()}
            </span>
        </p>

        <br/>
        <h3>Back up your secret key!</h3>
        <p>
            - Your spam wallet is stored in your browser, only you have access to it.<br/>
            - Clearing cookies will delete your wallet, and we cannot recover it for you.<br/>
            - Copy your secret key and keep it safe, this allows you to restore your wallet.<br/>
        </p>

        <br/>
        <div className="btn-group">
            <button className="btn" onClick={onCreateWallet}>NEW WALLET</button>
            <button className="btn">IMPORT</button> {/* TODO */}
            {/* <button className="btn">WITHDRAW</button> TODO */}
        </div>
    </>;
};
