import { useNavigate, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { Wallet } from "./lib/storage";
import { useEffect } from "react";

export const PageUser: React.FC = () =>
{
    const navigate = useNavigate();

    const { wallet, replaceWallet } = useOutletContext<AppContext>();

    useEffect(() => {
        if (wallet) {
            navigate("/spam");
        }
    }, [wallet]);

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

    return <>
        <h1>User</h1>
        {content}
    </>;
};
