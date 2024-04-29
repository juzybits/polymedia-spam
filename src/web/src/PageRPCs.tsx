import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageRPCs: React.FC = () =>
{
    const { network, rpcUrls } = useOutletContext<AppContext>();

    return <>
        <h1><span className="rainbow">RPCs</span></h1> {/* TODO */}
        <p>Network: {network}</p>
        <div>
            {rpcUrls.map(url => <p key={url}>
                {url}
            </p>)}
        </div>
    </>;
};
