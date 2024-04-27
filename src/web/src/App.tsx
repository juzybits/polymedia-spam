import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import {
    SPAM_DECIMALS,
    SPAM_MODULE,
    SPAM_SYMBOL,
    SUI_DECIMALS,
    SpamEvent,
    Spammer,
    emptyUserCounters,
} from "@polymedia/spam-sdk";
import { convertBigIntToNumber } from "@polymedia/suits";
import { LinkExternal, NetworkSelector, isLocalhost, loadNetwork } from "@polymedia/webutils";
import { useEffect, useState } from "react";
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { PageHome } from "./PageHome";
import { PageNotFound } from "./PageNotFound";
import { PageSpam } from "./PageSpam";
import { PageStats } from "./PageStats";
import { PageWallet } from "./PageWallet";
import { loadKeypairFromStorage, loadRpcEndpointsFromStorage, saveKeypairToStorage } from "./lib/storage";
import { SpamView, UserBalances } from "./lib/types";
import "./styles/.shared.app.less";
import "./styles/App.less";
import { StatusSpan } from "./components/StatusSpan";

/* App router */

export const AppRouter: React.FC = () => {
    return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<App />} >
                <Route index element={<PageHome />} />
                <Route path="/spam" element={<PageSpam />} />
                <Route path="/wallet" element={<PageWallet />} />
                <Route path="/stats" element={<PageStats />} />
                <Route path="*" element={<PageNotFound />} />
            </Route>
        </Routes>
    </BrowserRouter>
    );
};

/* Network config */

const supportedNetworks = isLocalhost() // TODO add mainnet before launch
    ? ["testnet", "devnet", "localnet"] as const
    : ["testnet", "devnet"] as const;
type NetworkName = typeof supportedNetworks[number];
const defaultNetwork = isLocalhost() ? "testnet" : "testnet"; // TODO change to mainnet before launch
const loadedNetwork = loadNetwork(supportedNetworks, defaultNetwork);

/* App */

export type ReactSetter<T> = React.Dispatch<React.SetStateAction<T>>;

export type AppContext = {
    balances: UserBalances;
    spammer: Spammer;
    spamView: SpamView;
    replaceKeypair: (keypair: Ed25519Keypair) => void;
};

const emptySpamView = (): SpamView => {
    return {
        status: "stopped",
        events: [],
        counters: emptyUserCounters(),
    };
}

const emptyBalances = (): UserBalances => {
    return { sui: -1, spam: -1 };
}

const App: React.FC = () =>
{
    /* State */

    const inProgress = false;
    const [ showMobileNav, setShowMobileNav ] = useState(false);
    const [ balances, setBalances ] = useState<UserBalances>(emptyBalances());
    const [ spamView, setSpamView ] = useState<SpamView>(emptySpamView());
    const [ spammer, setSpammer ] = useState(new Spammer(
        loadKeypairFromStorage(),
        loadedNetwork,
        loadRpcEndpointsFromStorage(loadedNetwork),
        spamEventHandler,
    ));

    const appContext: AppContext = {
        balances,
        spammer,
        spamView,
        replaceKeypair,
    };

    /* Functions */

    useEffect(() =>
    {
        setSpamView(emptySpamView());
        setBalances(emptyBalances());

        /* repaint on demand whenever there is a Spammer event */

        spammer.addEventHandler(spamEventHandler);

        /* repaint periodically */

        const updateBalances = async () => {
            try {
                const balanceSui = await spammer.getSuiClient().getBalance({
                    owner: spammer.getSpamClient().signer.toSuiAddress(),
                });
                const balanceSpam = await spammer.getSuiClient().getBalance({
                    owner: spammer.getSpamClient().signer.toSuiAddress(),
                    coinType: `${spammer.getSpamClient().packageId}::${SPAM_MODULE}::${SPAM_SYMBOL}`,
                });
                setBalances({
                    spam: convertBigIntToNumber(BigInt(balanceSpam.totalBalance), SPAM_DECIMALS),
                    sui: convertBigIntToNumber(BigInt(balanceSui.totalBalance), SUI_DECIMALS),
                });
                // console.info("balance updated");
            } catch (err) {
                console.warn("balance update failed");
            }
        };

        const updateSpamView = async () => {
            try {
                const counters = await spammer.getSpamClient().fetchUserCountersAndClassify();
                setSpamView(oldView => ({
                    status: spammer.status,
                    events: oldView.events,
                    counters,
                }));
                // console.info("view updated");
            } catch (err) {
                console.warn("view update failed");
            }
        };

        updateBalances();
        updateSpamView();

        const updateFrequency = spammer.getSpamClient().network === "localnet" ? 5_000 : 30_000;
        const updatePeriodically = setInterval(async () => {
            if (spammer.status == "running") {
                await updateBalances();
            }
            if (spammer.status != "running") {
                await updateSpamView();
            }
        }, updateFrequency);

        /* clean up on component unmount */

        return () => {
            clearInterval(updatePeriodically);
            spammer.removeEventHandler(spamEventHandler);
        };
    }, [spammer]);

    function spamEventHandler(e: SpamEvent) {
        console[e.type](`${e.type}: ${e.msg}`);
        setSpamView(oldView => {
            if (e.type !== "debug") {
                oldView.events.push(e.msg);
            }
            return {
                status: spammer.status,
                events: oldView.events,
                counters: spammer.userCounters,
            };
        });
        // console.info("on-demand view update");
    }

    function replaceKeypair(keypair: Ed25519Keypair): void {
        if (spammer.status === "running") {
            spammer.stop();
        }
        const network = spammer.getSpamClient().network;
        setSpammer(new Spammer(
            keypair,
            network,
            loadRpcEndpointsFromStorage(network),
            spamEventHandler,
        ));
        saveKeypairToStorage(keypair);
    }

    /* HTML */

    const Header: React.FC = () =>
    {
        return <header>
            <Link to="/" onClick={e => { inProgress ? e.preventDefault() : undefined; }}>
                <h1>
                    <span><img alt="polymedia" src="/img/spam-logo.webp" className="logo" /></span>
                </h1>
            </Link>

            <span id="status-indicator">
                <StatusSpan status={spamView.status} />
            </span>
        </header>;
    };

    const Nav: React.FC = () =>
    {
        const closeMobileNav = () => {
            setShowMobileNav(false);
        };

        const location = useLocation();
        const selected = (name: string) => location.pathname === name ? "selected" : "";
        const onClick: React.MouseEventHandler = (e) => {
            inProgress ? e.preventDefault() : closeMobileNav();
        };

        return <nav>
            <Link to="/" className={selected("/")} onClick={onClick}>
                Home
            </Link>
            <Link to="/spam" className={selected("/spam")} onClick={onClick}>
                Spam
            </Link>
            <Link to="/wallet" className={selected("/wallet")} onClick={onClick}>
                Wallet
            </Link>
            <Link to="/stats" className={selected("/stats")} onClick={onClick}>
                Stats
            </Link>
            <div className="divider" />

            <BtnNetwork />
        </nav>;
    };

    const BtnNetwork: React.FC = () =>
    {
        const onSwitchNetwork = (newNet: NetworkName) => {
            if (spammer.status === "running") {
                spammer.stop();
            }
            setSpammer(new Spammer(
                spammer.getSpamClient().signer,
                newNet,
                loadRpcEndpointsFromStorage(newNet),
                spamEventHandler,
            ));
            setShowMobileNav(false);
        };
        return <NetworkSelector
            currentNetwork={(spammer.getSpamClient().network as NetworkName)}
            supportedNetworks={supportedNetworks}
            disabled={inProgress}
            onSwitch={onSwitchNetwork}
        />;
    };

    const BtnMenu: React.FC = () =>
    (
        <button
            id="btn-menu"
            disabled={inProgress}
            onClick={() => { setShowMobileNav(!showMobileNav); }}
        >
            {!showMobileNav ? "MENU" : "CLOSE"}
        </button>
    );

    const Footer: React.FC = () =>
    (
        <footer>
            <div id="icons">
                <LinkExternal href="https://polymedia.app" follow={true}>
                    <img alt="polymedia" src="https://assets.polymedia.app/img/all/logo-nomargin-transparent-512x512.webp" className="icon" />
                </LinkExternal>
                <LinkExternal href="https://github.com/juzybits/polymedia-spam" follow={true}>
                    <GitHubLogo />
                </LinkExternal>
            </div>
        </footer>
    );

    const layoutClasses: string[] = [];
    if (showMobileNav) {
        layoutClasses.push("menu-open");
    }
    if (inProgress) {
        layoutClasses.push("disabled");
    }

    return (
    <div id="layout" className={layoutClasses.join(" ")}>

        <div>
            <Header />

            <div id="nav-and-page">
                <Nav />

                <div id="page">
                    <div id="page-content">
                        <Outlet context={appContext} /> {/* Loads a Page*.tsx */}
                    </div>
                </div>
            </div>
        </div>

        <Footer />

        {/* Floating elements */}

        <BtnMenu />
    </div>
    );
};

const GitHubLogo: React.FC = () => <svg width="25" height="25" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="#fff"/></svg>;
