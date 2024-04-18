import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageHome: React.FC = () =>
{
    const { wallet } = useOutletContext<AppContext>();

    return <div id="page-content" >
        <h1><span className="rainbow">SPAM</span></h1>

        <h2>Spam to Earn on Sui</h2>

        <br />
        <p>
            The more transactions you send, the more SPAM coins you receive.
        </p>

        <br />
        <Link className="btn" to={wallet ? "/spam" : "/user"}>
            START
        </Link>

    </div>;
}
