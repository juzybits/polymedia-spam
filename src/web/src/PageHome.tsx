import { Link } from "react-router-dom";

export const PageHome: React.FC = () =>
{
    return <>
        <h1><span className="rainbow" style={{fontSize: "3rem"}}>SPAM</span></h1>

        <h2>Spam to Earn on Sui</h2>

        <p>
            The more transactions you send, the more SPAM you earn.
        </p>

        <br/>
        <Link className="btn" to="/spam">
            START
        </Link>

        <br/><br/>
        <h3>ELI5</h3>
        <div className="tight">
            <p>- One billion SPAM coins are minted every day.</p>
            <p>- You earn SPAM simply by sending Sui transactions.</p>
            <p>- The more txs you send, the more SPAM you receive.</p>
            <p>- There is no proof of work, only proof of spam.</p>
        </div>

        <br/>

        <p><a target="_blank" rel="noopener noreferrer" href="https://github.com/juzybits/polymedia-spam/blob/main/README.md">
            Read the docs
        </a></p>
    </>;
};
