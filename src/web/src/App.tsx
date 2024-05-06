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
import { convertBigIntToNumber, sleep } from "@polymedia/suits";
import { LinkExternal, NetworkSelector, isLocalhost, loadNetwork } from "@polymedia/webutils";
import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { PageHome } from "./PageHome";
import { PageNotFound } from "./PageNotFound";
import { PageRPCs } from "./PageRPCs";
import { PageSpam } from "./PageSpam";
import { PageStats } from "./PageStats";
import { PageWallet } from "./PageWallet";
import { StatusSpan } from "./components/StatusSpan";
import {
    RpcUrl,
    loadDisclaimerAcceptedFromStorage,
    loadKeypairFromStorage,
    loadRpcUrlsFromStorage,
    saveDisclaimerAcceptedToStorage,
    saveKeypairToStorage,
    saveRpcUrlsToStorage,
} from "./lib/storage";
import { SpamView, UserBalances } from "./lib/types";
import "./styles/.shared.app.less";
import "./styles/App.less";

/* App router */

export const AppRouter: React.FC = () => {
    return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<App />} >
                <Route index element={<PageHome />} />
                <Route path="/spam" element={<PageSpam />} />
                <Route path="/wallet" element={<PageWallet />} />
                <Route path="/rpcs" element={<PageRPCs />} />
                <Route path="/stats" element={<PageStats />} />
                <Route path="*" element={<PageNotFound />} />
            </Route>
        </Routes>
    </BrowserRouter>
    );
};

/* Network config */

const supportedNetworks = isLocalhost()
    ? ["mainnet", "testnet", "devnet", "localnet"] as const
    : ["mainnet", "testnet"] as const;
type NetworkName = typeof supportedNetworks[number];
const defaultNetwork = "mainnet";
const loadedNetwork = loadNetwork(supportedNetworks, defaultNetwork);

/* App */

export type ReactSetter<T> = React.Dispatch<React.SetStateAction<T>>;

export type AppContext = {
    network: NetworkName;
    rpcUrls: RpcUrl[]; updateRpcUrls: (newRpcs: RpcUrl[]) => Promise<void>;
    balances: UserBalances;
    spammer: React.MutableRefObject<Spammer>;
    spamView: SpamView;
    replaceKeypair: (keypair: Ed25519Keypair) => void;
    disclaimerAccepted: boolean; acceptDisclaimer: () => void;
};

const emptySpamView = (): SpamView => {
    return {
        events: [],
        counters: emptyUserCounters(),
    };
};

const emptyBalances = (): UserBalances => {
    return { sui: -1, spam: -1 };
};

const loadedPair = loadKeypairFromStorage();
const loadedRpcs = loadRpcUrlsFromStorage(loadedNetwork);

const App: React.FC = () =>
{
    /* State */

    const inProgress = false;
    const [ showMobileNav, setShowMobileNav ] = useState(false);
    const [ network, setNetwork ] = useState(loadedNetwork);
    const [ pair, setPair ] = useState<Ed25519Keypair>(loadedPair);
    const [ rpcUrls, setRpcUrls ] = useState<RpcUrl[]>(loadedRpcs);
    const [ balances, setBalances ] = useState<UserBalances>(emptyBalances());
    const [ spamView, setSpamView ] = useState<SpamView>(emptySpamView());
    const spammer = useRef(new Spammer(
        loadedPair,
        loadedNetwork,
        loadedRpcs.filter(rpc => rpc.enabled).map(rpc => rpc.url),
        handleSpamEvent,
    ));
    const [ disclaimerAccepted, setDisclaimerAccepted ] = useState<boolean>(loadDisclaimerAcceptedFromStorage());

    const appContext: AppContext = {
        network,
        rpcUrls, updateRpcUrls,
        balances,
        spammer,
        spamView,
        replaceKeypair: updateKeypair,
        disclaimerAccepted, acceptDisclaimer,
    };

    /* Functions */

    useEffect(() =>
    {
        setSpamView(emptySpamView());
        setBalances(emptyBalances());

        updateSpamView();
        updateBalances();

        /* repaint periodically */

        const updateFrequency = network === "localnet" ? 5_000 : 20_000;
        const updatePeriodically = setInterval(updateBalances, updateFrequency);

        /* clean up on component unmount */

        return () => {
            clearInterval(updatePeriodically);
        };
    }, [network, pair]);

    const updateBalances = async () => {
        try {
            const balanceSui = await spammer.current.getSuiClient().getBalance({
                owner: spammer.current.getSpamClient().signer.toSuiAddress(),
            });
            const balanceSpam = await spammer.current.getSuiClient().getBalance({
                owner: spammer.current.getSpamClient().signer.toSuiAddress(),
                coinType: `${spammer.current.getSpamClient().packageId}::${SPAM_MODULE}::${SPAM_SYMBOL}`,
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

    const updateSpamView = async (): Promise<void> => {
        try {
            const counters = await spammer.current.getSpamClient().fetchUserCountersAndClassify();
            setSpamView({
                events: [],
                counters,
            });
            // console.info("view updated");
        } catch (err) {
            console.warn("view reset failed");
        }
    };

    function handleSpamEvent(e: SpamEvent): void {
        console[e.type](e.msg);
        setSpamView(oldView => {
            if (e.type !== "debug") {
                // Only show non-debug events to the user
                oldView.events.push({
                    time: (new Date).toLocaleTimeString(),
                    msg: e.msg,
                });
                // Update balances when the spammer stops
                if (e.msg === "Stopped as requested") {
                    updateBalances();
                }
            }
            return {
                events: oldView.events,
                counters: spammer.current.userCounters,
            };
        });
        // console.info("on-demand view update");
    }

    function updateKeypair(newPair: Ed25519Keypair): void {
        if (spammer.current.status === "running") {
            spammer.current.stop();
        }
        spammer.current = new Spammer(
            newPair,
            network,
            rpcUrls.filter(rpc => rpc.enabled).map(rpc => rpc.url),
            handleSpamEvent,
        );
        setPair(newPair);
        saveKeypairToStorage(newPair);
    }

    async function updateRpcUrls(newRpcs: RpcUrl[]): Promise<void> {
        const wasRunning = spammer.current.status === "running";
        if (wasRunning) {
            spammer.current.stop();
        }
        spammer.current = new Spammer(
            pair,
            network,
            newRpcs.filter(rpc => rpc.enabled).map(rpc => rpc.url),
            handleSpamEvent,
        );
        setRpcUrls(newRpcs);
        saveRpcUrlsToStorage(network, newRpcs);
        if (wasRunning) {
            await sleep(3000); // hack, should start after the previous Spammer shuts down
            spammer.current.start(true);
        }
    }

    function updateNetwork(newNet: NetworkName): void {
        if (spammer.current.status === "running") {
            spammer.current.stop();
        }
        const loadedRpcs = loadRpcUrlsFromStorage(newNet);
        spammer.current = new Spammer(
            pair,
            newNet,
            loadedRpcs.filter(rpc => rpc.enabled).map(rpc => rpc.url),
            handleSpamEvent,
        );
        setNetwork(newNet);
        setRpcUrls(loadedRpcs);
        setShowMobileNav(false);
    }

    function acceptDisclaimer(): void {
        setDisclaimerAccepted(true);
        saveDisclaimerAcceptedToStorage();
    }

    /* HTML */

    const BtnNetwork: React.FC = () =>
        {
            return <NetworkSelector
                currentNetwork={network}
                supportedNetworks={supportedNetworks}
                disabled={inProgress}
                onSwitch={updateNetwork}
            />;
        };

    const Header: React.FC = () =>
    {
        return <header>
            <Link to="/" onClick={e => { inProgress ? e.preventDefault() : undefined; }}>
                <h1>
                    <span><img alt="polymedia" src="/img/spam-logo.webp" className="logo" /></span>
                </h1>
            </Link>

            <span id="status-indicator">
                <StatusSpan status={spammer.current.status} />
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
            <Link to="/rpcs" className={selected("/rpcs")} onClick={onClick}>
                RPCs
            </Link>
            <Link to="/stats" className={selected("/stats")} onClick={onClick}>
                Stats
            </Link>
            <div className="divider" />

            <BtnNetwork />
        </nav>;
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
