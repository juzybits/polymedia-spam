import { SPAM_IDS } from "@polymedia/spam-sdk";
import { formatNumber } from "@polymedia/suitcase-core";
import { LinkExternal } from "@polymedia/suitcase-react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { usePrice } from "./hooks/usePrice";

export const PageHome: React.FC = () =>
{
    const { network } = useOutletContext<AppContext>();
    const { price } = usePrice();
    const spamPackageId = SPAM_IDS[network].packageId;
    const mainnetMaxSupply = 37_000_000_000;

    return <div id="page-home">
    <div id="home-content">
        <h1><span className="rainbow" style={{fontSize: "3rem"}}>SPAM</span></h1>

        <img id="img-cult" src="img/cult.webp" alt="cult" />

        <h3>COIN TYPE</h3>
        <p>
            <span className="sui-address">
                {spamPackageId}::spam::SPAM
            </span>
        </p>

        {network === "mainnet" && <>
        <h3>MARKET DATA</h3>
            <div className="tight">
                <p>
                    Fully diluted valuation: <span style={{fontSize: "1.05em", fontWeight: "500"}}>
                        {!price ? "loading..." : "$" + formatNumber(price.usd * mainnetMaxSupply)}
                    </span>
                </p>
                <p>
                    SPAM / USD: <span style={{fontSize: "1.05em", fontWeight: "500"}}>
                        {!price ? "loading..." : price.usd}
                    </span>
                </p>
            </div>
        </>}

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

        <h3>IN THE MEDIA</h3>
        <div className="link-list">
            <p>
                <b>BINANCE</b>: <LinkExternal href="https://binance.com/en/square/post/2024-05-07-sui-s-on-chain-transactions-surge-due-to-spam-project-7762208634042" follow={true}>
                    <i>Sui's On-Chain Transactions Surge Due to Spam Project</i>
                </LinkExternal><br/>
            </p>

            <p>
                <b>BITCOIN.COM</b>: <LinkExternal href="https://news.bitcoin.com/sui-surpasses-solana-in-daily-transactions-amidst-spam-token-frenzy/" follow={true}>
                    <i>Sui Surpasses Solana in Daily Transactions Amidst Spam Token Frenzy</i>
                </LinkExternal><br/>
            </p>

            <p>
                <b>BITGET</b>: <LinkExternal href="https://bitget.com/news/detail/12560603992392" follow={true}>
                    <i>Spam: The driving force behind Sui's daily transaction volume exceeding Solana</i>
                </LinkExternal><br/>
            </p>

            <p>
                <b>COINTRUST</b>: <LinkExternal href="https://cointrust.com/market-news/sui-blockchain-surpasses-solana-in-stress-test-a-new-era-of-scalability" follow={true}>
                    <i>Sui Blockchain Surpasses Solana in Stress Test: A New Era of Scalability</i>
                </LinkExternal><br/>
            </p>

            <p>
                <b>BINANCE</b>: <LinkExternal href="https://binance.com/en/square/post/2024-05-08-sui-solana-spam-7813611345193" follow={true}>
                    <i>Sui's daily transaction volume exceeds Solana, and the Spam project becomes a driving force</i>
                </LinkExternal><br/>
            </p>

            <p>
                <b>BITRUE</b>: <LinkExternal href="https://support.bitrue.com/hc/en-001/articles/32146510725913-SUI-Network-Transactions-Surge-Analyzing-the-Impact-on-SUI-Price" follow={true}>
                    <i>Sui Network Transactions Surge: Analyzing the Impact on SUI Price</i>
                </LinkExternal><br/>
            </p>

            <p>
                <b>AMBCRYPTO</b>: <LinkExternal href="https://ambcrypto.com/sui-crypto-transactions-surge-will-its-price-see-growth/" follow={true}>
                    <i>Sui crypto transactions surge – Will its price see growth?</i>
                </LinkExternal><br/>
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
