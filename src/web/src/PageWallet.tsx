import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { validateAndNormalizeSuiAddress } from "@polymedia/suits";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { PageDisclaimer } from "./PageDisclaimer";
import { loadClaimAddressFromStorage, pairFromSecretKey } from "./lib/storage";

export const PageWallet: React.FC = () =>
{
    /* State */

    const { replaceKeypair, spammer, disclaimerAccepted, updateClaimAddress } = useOutletContext<AppContext>();
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
                IMPORT
            </button>
            {errMsg && <div className="error-box">
                <div>Invalid secret key:</div>
                <div>{errMsg}</div>
            </div>}
        </>;
    };

    const ClaimAddressForm: React.FC = () => {
        const [ claimAddress, setClaimAddress ] = useState<string|undefined>(loadClaimAddressFromStorage());
        const [ msg, setMsg ] = useState<{ type: "okay"|"error", text: string }>();
        const disableSubmit = msg?.type === "error" || !claimAddress;

        const onInputChange = (evt: React.ChangeEvent<HTMLTextAreaElement>): void  => {
            const newClaimAddress = evt.currentTarget.value;
            setClaimAddress(newClaimAddress);
            if (newClaimAddress.length === 0) {
                setMsg(undefined);
                return;
            }
            const cleanAddress = validateAndNormalizeSuiAddress(newClaimAddress);
            if (!cleanAddress) {
                setMsg({ type: "error", text: "Invalid address" });
                return;
            }
            setMsg(undefined);
        };

        const onKeyDown = (evt: React.KeyboardEvent<HTMLTextAreaElement>): void  => {
            if (evt.key === "Enter" && !disableSubmit) {
                evt.preventDefault();
                onSubmit();
            }
        };

        const onSubmit = (): void => {
            if (claimAddress) {
                try {
                    updateClaimAddress(claimAddress);
                    setMsg({ type: "okay", text: "Saved!" });
                } catch (err) {
                    setMsg({ type: "error", text: String(err) });
                }
            }
        };

        return <>
            <br/><br/>
            <h3>Claim address</h3>
            <p>
                Send claimed SPAM to this address:
            </p>
            <textarea
                value={claimAddress}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                autoFocus={true}
                style={{width: "100%", maxWidth: "600px", wordBreak: "break-all"}}
            />
            <br/>
            <button className="btn" onClick={onSubmit} disabled={disableSubmit}>
                SET CLAIM ADDRESS
            </button>
            {msg && <div className={`${msg.type}-box`}>
                <div>{msg.text}</div>
            </div>}
        </>
    }

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

        <ClaimAddressForm />
    </>;
};
