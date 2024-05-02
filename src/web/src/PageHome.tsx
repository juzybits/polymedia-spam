import { SPAM_IDS } from "@polymedia/spam-sdk";
import { Link, useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { LinkExternal } from "@polymedia/webutils";

export const PageHome: React.FC = () =>
{
    const { network } = useOutletContext<AppContext>();
    const spamPackageId = SPAM_IDS[network].packageId;

    return <div id="page-home">
    <div id="home-content">
        <h1><span className="rainbow" style={{fontSize: "3rem"}}>SPAM</span></h1>

        <h2>Spam to Earn on Sui</h2>

        <p>
            The more transactions you send, the more SPAM you earn.
        </p>

        <Link className="btn" to="/spam">
            START
        </Link>

        <h3>Coin type</h3>
        <p>
            <span className="sui-address">
                {spamPackageId}::spam::SPAM
            </span>
        </p>

        <h3>ELI5</h3>
        <div className="tight">
            <p>▸ One billion SPAM coins are minted every day.</p>
            <p>▸ You earn SPAM simply by sending Sui transactions.</p>
            <p>▸ The more txs you send, the more SPAM you receive.</p>
            <p>▸ There is no proof of work, only proof of spam.</p>
        </div>

        <p>
            <LinkExternal follow={true} href="https://github.com/juzybits/polymedia-spam/blob/main/README.md" >
                Read the docs
            </LinkExternal>
        </p>

    </div>
    </div>;
};
