import { SPAM_IDS } from "@polymedia/spam-sdk";
import { LinkExternal } from "@polymedia/suitcase-react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";

export const PageHome: React.FC = () =>
{
    const { network } = useOutletContext<AppContext>();
    const spamPackageId = SPAM_IDS[network].packageId;

    return <div id="page-home">
    <div id="home-content">
        <h1><span className="rainbow" style={{fontSize: "3rem"}}>SPAM</span></h1>

        <h3 style={{paddingTop: "1rem"}}>
            IT'S A CULT
        </h3>
        <img id="img-cult" src="img/cult.webp" alt="cult" />

        <h3>COIN TYPE</h3>
        <p>
            <span className="sui-address">
                {spamPackageId}::spam::SPAM
            </span>
        </p>

        <h3>CHART</h3>
        <div className="tight">
            <p>
                <LinkExternal href="https://birdeye.so/token/0x30a644c3485ee9b604f52165668895092191fcaf5489a846afa7fc11cdb9b24a::spam::SPAM?chain=sui">
                    Birdeye (Turbos & Cetus)
                </LinkExternal>
            </p>
            <p>
                <LinkExternal href="https://dexscreener.com/sui/0x1e74d37329126a52a60a340ffda7e047e175442f4df096e1b2b40c40fa5fc213">
                    DEX Screener (Turbos)
                </LinkExternal>
            </p>
            <p>
                <LinkExternal href="https://www.geckoterminal.com/sui-network/pools/0xf3874d627a9e6528ba24dfb2d1ae5335400e2436241b010244c0cb2878725480">
                    GeckoTerminal (Cetus)
                </LinkExternal>
            </p>
            <p>
                <LinkExternal href="https://coinmarketcap.com/dexscan/sui%20network/0xf3874d627a9e6528ba24dfb2d1ae5335400e2436241b010244c0cb2878725480/">
                    CoinMarketCap (Cetus)
                </LinkExternal>
            </p>
        </div>

        <h3>TRADING</h3>
        <div className="tight">
            <p>
                <LinkExternal href="https://app.turbos.finance/#/trade?input=0x2::sui::SUI&output=0x30a644c3485ee9b604f52165668895092191fcaf5489a846afa7fc11cdb9b24a::spam::SPAM">
                    Turbos Finance
                </LinkExternal>
            </p>
            <p>
                <LinkExternal href="https://hop.ag/swap/SUI-SPAM">
                    Hop Aggregator
                </LinkExternal>
            </p>
            <p>
                <LinkExternal href="https://aftermath.finance/trade?fromCoin=0x2%3A%3Asui%3A%3ASUI&toCoin=0x30a644c3485ee9b604f52165668895092191fcaf5489a846afa7fc11cdb9b24a%3A%3Aspam%3A%3ASPAM">
                    Aftermath Finance
                </LinkExternal>
            </p>
            <p>
                <LinkExternal href="https://flowx.finance/swap?coinIn=0x2::sui::SUI&coinOut=0x30a644c3485ee9b604f52165668895092191fcaf5489a846afa7fc11cdb9b24a::spam::SPAM">
                    FlowX Finance
                </LinkExternal>
            </p>
        </div>

        <h3>SOCIALS</h3>
        <p style={{paddingBottom: 0}}>
            There are no official social media accounts, only community-owned:
        </p>
        <div className="tight">
            <p>
                <LinkExternal href="https://x.com/juzybits">
                    Twitter
                </LinkExternal> (@juzybits)
            </p>
            <p>
                <LinkExternal href="https://x.com/SPAM_SUI">
                    Twitter
                </LinkExternal> (@SPAM_SUI)
            </p>
            <p>
                <LinkExternal href="https://t.me/spam_sui">
                    Telegram
                </LinkExternal> (/spam_sui)
            </p>
            <p>
                <LinkExternal href="https://discord.gg/DsxqP88EQp">
                    Discord
                </LinkExternal> (Polymedia)
            </p>
        </div>

        <h3>PHILOSOPHY</h3>
        <div className="tight">
            <p>
                <LinkExternal href="https://x.com/juzybits/status/1789587870900007104" follow={true}>
                    <i>SPAM embodies the ideals of crypto</i>
                </LinkExternal>
            </p>
            <p>
                <LinkExternal href="https://x.com/juzybits/status/1798664689498632196" follow={true}>
                    <i>The goals of SPAM, and why mining ended</i>
                </LinkExternal>
            </p>
        </div>

        <h3>SOURCE CODE</h3>
        <div className="tight">
            <p>
                <LinkExternal href="https://github.com/juzybits/polymedia-spam" follow={true}>
                    <i>SPAM repo on GitHub</i>
                </LinkExternal>
            </p>
        </div>

    </div>
    </div>;
};
