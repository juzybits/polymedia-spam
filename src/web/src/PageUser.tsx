import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { Wallet } from "./lib/storage";

export const PageUser: React.FC = () =>
{
    const { wallet, replaceWallet } = useOutletContext<AppContext>();

    const createWallet = () => {
        const pair = new Ed25519Keypair();
        const wallet: Wallet = {
            address: pair.toSuiAddress(),
            secretKey: pair.getSecretKey(),
        };
        replaceWallet(wallet);
    };

    const content = wallet
    ? <>
        Your address is: {wallet.address}
    </>
    : <>
        <div className="btn-group">
            <button className="btn" onClick={createWallet}>CREATE WALLET</button>
            <button className="btn">IMPORT WALLET</button> {/* TODO */}
        </div>
    </>;

    return <div id="page-content" >
        <h1>User</h1>
        {content}
    </div>;
}
