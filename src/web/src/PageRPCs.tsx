import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { RpcUrl } from "./lib/storage";
import { RPC_ENDPOINTS } from "@polymedia/spam-sdk";

export const PageRPCs: React.FC = () =>
{
    const { network, spammer, rpcUrls, updateRpcUrls } = useOutletContext<AppContext>();

    const [ rpcs, setRpcs ] = useState<RpcUrl[]>([...rpcUrls]);
    const [ newRpcUrl, setNewRpcUrl ] = useState("");
    const [ hasChanges, setHasChanges ] = useState<boolean>(false);
    const [ showSavedMessage, setShowSavedMessage ] = useState<boolean>(false);

    useEffect(() => {
        setRpcs([...rpcUrls]);
        setNewRpcUrl("");
        setHasChanges(false);
    }, [rpcUrls]);

    useEffect(() => {
        if (!rpcs.some(rpc => rpc.enabled)) {
            setHasChanges(false);
        }
    }, [rpcs]);

    const onCheckboxChange = (url: string) => {
        setHasChanges(true);
        setRpcs(prevRpcs =>
            prevRpcs.map(rpc =>
                rpc.url !== url ? rpc : { ...rpc, enabled: !rpc.enabled }
            )
        );
    };

    const onSubmit = async () => {
        await updateRpcUrls(rpcs);
        setHasChanges(false);
        setShowSavedMessage(true);
        setTimeout(() => { setShowSavedMessage(false); }, 2000);
    };

    const onAddRpcUrl = () => {
        const trimmedUrl = newRpcUrl.trim();
        if (trimmedUrl && !rpcs.find(rpc => rpc.url === trimmedUrl)) {
            setRpcs(rpcs.concat({ url: trimmedUrl, enabled: true }));
            setNewRpcUrl("");
            setHasChanges(true);
        }
    };

    const onResetRpcs = () => {
        setRpcs(RPC_ENDPOINTS[network].map(rpcUrl => {
            return { url: rpcUrl, enabled: true };
        }));
        setHasChanges(true);
    };

    return <>
        <h1><span className="rainbow">RPCs</span></h1>

        <div id="page-rpc" className="tight">
            <p>
                You can choose which RPCs to use for spamming transactions.
            </p>
            <p>
                The app rotates between enabled RPCs to avoid hitting rate limits.
            </p>

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

                <div>
                    <button className="btn" onClick={onSubmit} disabled={!hasChanges}>
                        {spammer.current.status === "running" ? "Save and restart" : "Save"}
                    </button>
                    {showSavedMessage &&
                        <div style={{color: "lightgreen"}}>Done!</div>
                    }
                </div>
            </div>

            <div className="subsection">
                <p>You can also add a custom RPC:</p>
                <input
                    type="text"
                    value={newRpcUrl}
                    onChange={e => setNewRpcUrl(e.target.value)}
                    placeholder="Add new RPC"
                />
                <br/>
                <button className="btn" onClick={onAddRpcUrl}>Add RPC</button>
            </div>

            <div className="subsection">
                <p>Restore the default RPC list:</p>
                <button className="btn" onClick={onResetRpcs}>
                    Reset RPCs
                </button>
            </div>
        </div>
    </>;
};
