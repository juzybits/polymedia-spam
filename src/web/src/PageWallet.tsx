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

    const { spammer, disclaimerAccepted, replaceKeypair, updateClaimAddress }
        = useOutletContext<AppContext>();
    const [ createSuccess, setCreateSuccess ] = useState<boolean>(false);
    const [ importSuccess, setImportSuccess ] = useState<boolean>(false);

    /* Functions */

    const confirmAndReplaceWallet = (pair: Ed25519Keypair): boolean => {
        const userAccepted = window.confirm(
            "🚨 WARNING 🚨\n\nThis will delete and replace your current wallet.\n\nAre you sure?"
        );
        if (userAccepted) {
            replaceKeypair(pair);
        }
        return userAccepted;
    };

    /* HTML */

    if (!disclaimerAccepted) {
        return <PageDisclaimer />;
    }

    const WalletInfo: React.FC = () =>
    {
        return <div id="wallet-info">
        <h2>Web miner wallet</h2>
        <div id="wallet-content">
            <div className="wallet-section">
                <h4>Sui address:</h4>
                <p>Send SUI to this address to fund your miner wallet.</p>
                <span className="sui-address">
                    {spammer.current.getSpamClient().signer.toSuiAddress()}
                </span>
            </div>
            <div className="wallet-section">
                <h4>Secret key:</h4>
                <p>It allows you to restore your wallet. Copy it somewhere safe!</p>
                <span className="sui-address">
                    {(spammer.current.getSpamClient().signer as Ed25519Keypair).getSecretKey()}
                </span>
                <div className="dont-share-secret-key">Don't share your secret key with anyone</div>
            </div>
        </div>
        </div>;
    }

    const ClaimAddressForm: React.FC = () =>
    {
        const [ claimAddress, setClaimAddress ] = useState<string|undefined>(loadClaimAddressFromStorage());
        const [ msg, setMsg ] = useState<{ type: "okay"|"error", text: string }>();
        const disableButton = msg?.type === "error" || !claimAddress || spammer.current.status !== "stopped";
        const disableTextarea = spammer.current.status !== "stopped";

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
            if (evt.key === "Enter" && !disableButton) {
                evt.preventDefault();
                onSubmit();
            }
        };

        const onSubmit = (): void => {
            if (claimAddress) {
                try {
                    updateClaimAddress(claimAddress);
                    setMsg({ type: "okay", text: "Success!" });
                } catch (err) {
                    setMsg({ type: "error", text: String(err) });
                }
            }
        };

        const onStopSpammer = () => {
            if (spammer.current.status === "running") {
                spammer.current.stop();
            }
        };

        return <div>
            <h2>Set claim address</h2>
            <p>
                Send claimed SPAM to this address:
            </p>
            <textarea
                value={claimAddress}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                disabled={disableTextarea}
                style={{width: "100%", maxWidth: "536px", wordBreak: "break-all"}}
            />
            <br/>
            {spammer.current.status !== "stopped"
            ?
                <button className="btn" onClick={onStopSpammer}>
                    STOP MINER TO SET ADDRESS
                </button>
            :
                <button className="btn" onClick={onSubmit} disabled={disableButton}>
                    SET CLAIM ADDRESS
                </button>
            }
            {msg && <div className={`${msg.type}-box`}>
                <div>{msg.text}</div>
            </div>}
        </div>;
    }

    const ImportWalletForm: React.FC = () =>
    {
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
            setImportSuccess(false);
            const pair = pairFromSecretKey(secretKey);
            const okay = confirmAndReplaceWallet(pair);
            setImportSuccess(okay);
        };

        return <div>
            <h2>Import existing wallet</h2>
            <p>
                Paste your secret key and click the import button.
            </p>
            <input
                type="text"
                value={secretKey}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                style={{width: "100%", maxWidth: "536px"}}
            />
            <br/>
            <button className="btn" onClick={onSubmit} disabled={disableSubmit}>
                IMPORT
            </button>
            {errMsg && <div className="error-box">
                <div>Invalid secret key:</div>
                <div>{errMsg}</div>
            </div>}
            {importSuccess && <div className="okay-box">
                <div>Success!</div>
            </div>}
        </div>;
    };

    const CreateWalletForm: React.FC = () =>
    {
        const onSubmit = (): void => {
            setCreateSuccess(false);
            const okay = confirmAndReplaceWallet(new Ed25519Keypair());
            setCreateSuccess(okay);
        };

        return <div>
            <h2>Create new wallet</h2>
            <p>Delete your current wallet and replace it with a new one.</p>
            <div className="btn-group">
                <button className="btn" onClick={onSubmit}>
                    CREATE WALLET
                </button>
            </div>
            {createSuccess && <div className="okay-box">
                <div>Success!</div>
            </div>}
        </div>;
    };

    const BackUpWarning: React.FC = () =>
    {
        return <div>
            <h2>Back up your secret key!</h2>
            <div className="tight">
                <p>▸ Your spam wallet is stored in your browser, only you have access to it.</p>
                <p>▸ Clearing cookies will delete your wallet, and we cannot recover it for you.</p>
                <p>▸ Copy your secret key and keep it safe, this allows you to restore your wallet.</p>
            </div>
        </div>;
    };

    return <div id="page-wallet">
        <h1><span className="rainbow">Wallet</span></h1>

        <div id="page-wallet-sections">
            <WalletInfo />

            <ClaimAddressForm />

            <CreateWalletForm />

            <ImportWalletForm />

            <BackUpWarning />
        </div>
    </div>;
};
