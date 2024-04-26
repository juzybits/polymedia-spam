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
        <h1><span className="rainbow">Wallet</span></h1>

        <div id="wallet-info">
            <div id="wallet-content">
                <div className="wallet-section">
                    <h4>Your Sui address:</h4>
                    <span className="wallet-key-or-address">
                        {spammer.getSpamClient().signer.toSuiAddress()}
                    </span>
                </div>
                <div className="wallet-section">
                    <h4>Your secret key:</h4>
                    <span className="wallet-key-or-address">
                        {(spammer.getSpamClient().signer as Ed25519Keypair).getSecretKey()}
                    </span>
                </div>
            </div>
        </div>

        <div className="btn-group">
            <button className="btn" onClick={onCreateWallet}>NEW WALLET</button>
            <button className="btn">IMPORT</button> {/* TODO */}
            {/* <button className="btn">WITHDRAW</button> TODO */}
        </div>

        <br/>
        <h3>Back up your secret key!</h3>
        <p>
            - Your spam wallet is stored in your browser, only you have access to it.<br/>
            - Clearing cookies will delete your wallet, and we cannot recover it for you.<br/>
            - Copy your secret key and keep it safe, this allows you to restore your wallet.<br/>
        </p>
    </>;
};
