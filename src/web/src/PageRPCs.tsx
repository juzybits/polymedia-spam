import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { RpcUrl } from "./lib/storage";

export const PageRPCs: React.FC = () =>
{
    const { spamView, rpcUrls, replaceRpcUrls } = useOutletContext<AppContext>();

    const [ rpcs, setRpcs ] = useState<RpcUrl[]>([...rpcUrls]);
    const [ hasChanges, setHasChange ] = useState<boolean>(false);
    const [ showSavedMessage, setShowSavedMessage ] = useState<boolean>(false);

    const onCheckboxChange = (url: string) => {
        setRpcs(prevRpcs =>
            prevRpcs.map(rpc =>
                rpc.url !== url ? rpc : { ...rpc, enabled: !rpc.enabled }
            )
        );
        setHasChange(true);
    };

    const onSubmit = () => {
        replaceRpcUrls(rpcs);
        setHasChange(false);
        setShowSavedMessage(true);
        setTimeout(() => { setShowSavedMessage(false); }, 2000);
    };

    return <>
        <h1><span className="rainbow">RPCs</span></h1>

        <div className="tight">
            <p>
                You can choose which RPCs to use for spamming transactions.
            </p>
            <p>
                The app rotates between enabled RPCs to avoid hitting rate limits.
            </p>
        </div>

        <div id="rpc-selector">
            {rpcs.map(rpc => (
                <div key={rpc.url} className="rpc">
                <label>
                    <input
                        type="checkbox"
                        checked={rpc.enabled}
                        onChange={() => onCheckboxChange(rpc.url)}
                    />
                    {rpc.url}
                </label>
                </div>
            ))}
            <p>
                <button className="btn" onClick={onSubmit} disabled={!hasChanges}>
                    {spamView.status === "running" ? "Save and restart" : "Save"}
                </button>
                {showSavedMessage &&
                    <div style={{color: "lightgreen", paddingLeft: "0.9rem"}}>Done!</div>
                }
            </p>
        </div>
    </>;
};
