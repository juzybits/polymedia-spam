import { Link } from "react-router-dom";

export const PageHome: React.FC = () =>
{
    return <>
        <h1><span className="rainbow" style={{fontSize: "2.5rem"}}>SPAM</span></h1>

        <h2>Spam to Earn on Sui</h2>

        <p>
            The more transactions you send, the more SPAM coins you receive.
        </p>

        <br/>
        <h3>ELI5</h3>
        <div className="tight">
            <p>- One billion SPAM coins are minted every day.</p>
            <p>- You can earn SPAM simply by sending transactions.</p>
            <p>- The more txs you send, the more SPAM you earn.</p>
            <p>- There is no proof of work.</p>
        </div>

        <br/>
        <Link className="btn" to="/spam">
            START
        </Link>
    </>;
};
