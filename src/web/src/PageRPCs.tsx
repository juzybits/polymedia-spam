import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { RpcUrl } from "./lib/storage";

export const PageRPCs: React.FC = () =>
{
    const { network, rpcUrls, replaceRpcUrls } = useOutletContext<AppContext>();

    const [ rpcs, setRpcs ] = useState<RpcUrl[]>([...rpcUrls]);

    const onCheckboxChange = (url: string) => {
        setRpcs(prevRpcs =>
            prevRpcs.map(rpc =>
                rpc.url !== url ? rpc : { ...rpc, enabled: !rpc.enabled }
            )
        );
    };

    const onSubmit = () => {
        replaceRpcUrls(rpcs);
    };

    return <>
        <h1><span className="rainbow">RPCs</span></h1>

        <p>Network: {network}</p>

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
            <button className="btn" onClick={onSubmit}>Save</button>
        </div>
    </>;
};
