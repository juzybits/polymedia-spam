import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { PageDisclaimer } from "./PageDisclaimer";
import { pairFromSecretKey } from "./lib/storage";

export const PageWallet: React.FC = () =>
{
    /* State */

    const { replaceKeypair, spammer, disclaimerAccepted } = useOutletContext<AppContext>();
    const [ showImport, setShowImport ] = useState<boolean>(false);
    const [ showSuccess, setShowSuccess ] = useState<boolean>(false);

    /* Functions */

    const confirmAndReplaceWallet = (pair: Ed25519Keypair) => {
        const resp = window.confirm(
            "🚨 WARNING 🚨\n\nThis will delete and replace your current wallet.\n\nAre you sure?"
        );
        if (resp) {
            replaceKeypair(pair);
            setShowImport(false);
            setShowSuccess(true);
        }
    };

    /* HTML */

    if (!disclaimerAccepted) {
        return <PageDisclaimer />;
    }

    const BackUpWarning: React.FC = () => {
        return <>
            <h3>Back up your secret key!</h3>
            <div className="tight">
                <p>▸ Your spam wallet is stored in your browser, only you have access to it.</p>
                <p>▸ Clearing cookies will delete your wallet, and we cannot recover it for you.</p>
                <p>▸ Copy your secret key and keep it safe, this allows you to restore your wallet.</p>
            </div>
        </>;
    };

    const ImportForm: React.FC = () => {
        const [ secretKey, setSecretKey ] = useState<string>("");
        const [ errMsg, setErrMsg ] = useState<string|null>(null);

        const disableSubmit = errMsg !== null || secretKey.length === 0;

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

        const onKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>): void  => {
            if (evt.key === "Enter" && !disableSubmit) {
                onSubmit();
            }
        };

        const onSubmit = (): void => {
            const pair = pairFromSecretKey(secretKey);
            if (spammer.current.status === "running") {
                spammer.current.stop();
            }
            confirmAndReplaceWallet(pair);
        };

        return <>
            <h3>Import wallet</h3>
            <p>
                Paste your secret key and click the import button.
            </p>
            <input
                type="text"
                value={secretKey}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
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
                    <p>This is the Sui address of your spam wallet. Send $SUI to this address to fund your spam wallet and start mining.</p>
                    <span className="sui-address">
                        {spammer.current.getSpamClient().signer.toSuiAddress()}
                    </span>
                </div>
                <div className="wallet-section">
                    <h4>Your secret key:</h4>
                    <p>This is the private key of your spam wallet. Copy it somewhere safe! This allows you to restore your wallet later.</p>
                    <span className="sui-address">
                        {(spammer.current.getSpamClient().signer as Ed25519Keypair).getSecretKey()}
                    </span>
                    <div className="dont-share-secret-key">Don't share your secret key with anyone</div>
                </div>
            </div>
        </div>

        <div className="btn-group" style={{paddingBottom: "1.5rem"}}>
            <button className="btn" onClick={() => confirmAndReplaceWallet(new Ed25519Keypair())}>
                NEW WALLET
            </button>
            <button className="btn" onClick={() => {setShowImport(oldImport => !oldImport); setShowSuccess(false);}}>
                IMPORT
            </button>
        </div>

        {showSuccess && <h3 style={{color: "lightgreen"}}>Success!</h3>}

        {showImport ? <ImportForm /> : <BackUpWarning />}
    </>;
};
