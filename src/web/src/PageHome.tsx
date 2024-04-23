import { Link } from "react-router-dom";

export const PageHome: React.FC = () =>
{
    return <>
        <h1><span className="rainbow">SPAM</span></h1>

        <h2>Spam to Earn on Sui</h2>

        <br />
        <p>
            The more transactions you send, the more SPAM coins you receive.
        </p>

        <br/><br/>
        <Link className="btn" to="/spam">
            START
        </Link>
    </>;
};
