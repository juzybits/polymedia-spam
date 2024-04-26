import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { pairFromSecretKey } from "./lib/storage";

export const PageWallet: React.FC = () =>
{
    const { replaceKeypair, spammer } = useOutletContext<AppContext>();
    const [ showImport, setShowImport ] = useState<boolean>(false);

    const confirmAndReplaceWallet = (pair: Ed25519Keypair) => {
        const resp = window.confirm(
            "🚨 WARNING 🚨\n\nThis will delete and replace your current wallet.\n\nAre you sure?"
        );
        if (resp) {
            replaceKeypair(pair);
            setShowImport(false);
        }
    };

    const BackUpWarning: React.FC = () => {
        return <>
            <h3>Back up your secret key!</h3>
            <p>
                - Your spam wallet is stored in your browser, only you have access to it.<br/>
                - Clearing cookies will delete your wallet, and we cannot recover it for you.<br/>
                - Copy your secret key and keep it safe, this allows you to restore your wallet.<br/>
            </p>
        </>;
    };

    const ImportForm: React.FC = () => {
        const [ secretKey, setSecretKey ] = useState<string>("");
        const [ errMsg, setErrMsg ] = useState<string|null>(null);

        const onInputChange = (evt: React.ChangeEvent<HTMLInputElement>): void  => {
            const newSecretKey = evt.currentTarget.value;
            setSecretKey(newSecretKey);
            if (newSecretKey.length === 0) {
                setErrMsg(null);
                return;
            }
            try {
                pairFromSecretKey(newSecretKey);
                setErrMsg(null);
            } catch (err) {
                setErrMsg(String(err));
            }
        };

        const onSubmit = (): void => {
            const pair = pairFromSecretKey(secretKey);
            if (spammer.status === "running") {
                spammer.stop();
            }
            confirmAndReplaceWallet(pair);
        };

        const disableSubmit = errMsg !== null || secretKey.length === 0;

        return <>
            <h3>Import wallet</h3>
            <p>
                Paste your secret key and click the import button.
            </p>
            <input
                type="text"
                value={secretKey}
                onChange={onInputChange}
                autoFocus={true}
            />
            <br/>
            <button className="btn" onClick={onSubmit} disabled={disableSubmit}>
                Import
            </button>
            {errMsg && <div className="error-box">
                <div>Invalid secret key:</div>
                <div>{errMsg}</div>
            </div>}
        </>;
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
            <button className="btn" onClick={() => confirmAndReplaceWallet(new Ed25519Keypair())}>
                NEW WALLET
            </button>
            <button className="btn" onClick={() => setShowImport(oldImport => !oldImport)}>
                IMPORT
            </button>
            {/* <button className="btn">WITHDRAW</button> TODO */}
        </div>

        <br/>
        {showImport ? <ImportForm /> : <BackUpWarning />}
    </>;
};
