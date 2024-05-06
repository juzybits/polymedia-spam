import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageDisclaimer: React.FC = () =>
{
    const { disclaimerAccepted, acceptDisclaimer } = useOutletContext<AppContext>();

    return <>
        <h1><span className="rainbow">Disclaimer</span></h1>
        <p>Accepted: {disclaimerAccepted ? "yes" : "no"}</p>
        <button className="btn" onClick={acceptDisclaimer}>ACCEPT</button>
    </>;
};
