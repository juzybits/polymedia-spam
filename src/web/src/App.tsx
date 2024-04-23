import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { SpamEvent, SpamStatus, Spammer } from "@polymedia/spam-sdk";
import { RPC_ENDPOINTS } from "@polymedia/suits";
import { LinkExternal, Modal, NetworkSelector, isLocalhost, loadNetwork } from "@polymedia/webutils";
import { ReactNode, useState } from "react";
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { PageHome } from "./PageHome";
import { PageNotFound } from "./PageNotFound";
import { PageSpam } from "./PageSpam";
import { PageStats } from "./PageStats";
import { PageUser } from "./PageUser";
import { loadKeypairFromStorage, saveKeypairToStorage } from "./lib/storage";
import "./styles/shared.app.less";
import "./styles/App.less";

/* App router */

export const AppRouter: React.FC = () => {
    return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<App />} >
                <Route index element={<PageHome />} />
                <Route path="/spam" element={<PageSpam />} />
                <Route path="/user" element={<PageUser />} />
                <Route path="/stats" element={<PageStats />} />
                <Route path="*" element={<PageNotFound />} />
            </Route>
        </Routes>
    </BrowserRouter>
    );
};

/* Network config */

const supportedNetworks = ["mainnet", "testnet", "devnet", "localnet"] as const;
type NetworkName = typeof supportedNetworks[number];
const defaultNetwork = isLocalhost() ? "localnet" : "mainnet";
const loadedNetwork = loadNetwork(supportedNetworks, defaultNetwork);

/* App */

export type ReactSetter<T> = React.Dispatch<React.SetStateAction<T>>;

export type AppContext = {
    inProgress: boolean; setInProgress: ReactSetter<boolean>;
    showMobileNav: boolean; setShowMobileNav: ReactSetter<boolean>;
    setModalContent: ReactSetter<ReactNode>;
    spammer: Spammer; setSpammer: ReactSetter<Spammer>;
    replaceKeypair: (keypair: Ed25519Keypair) => void;
};

const App: React.FC = () =>
{
    /* State */

    const [ inProgress, setInProgress ] = useState(false);
    const [ showMobileNav, setShowMobileNav ] = useState(false);
    const [ modalContent, setModalContent ] = useState<ReactNode>(null);

    const [ spammerStatus, setSpammerStatus ] = useState<SpamStatus>("stopped");
    const [ spammer, setSpammer ] = useState(new Spammer(
        loadKeypairFromStorage(),
        loadedNetwork,
        RPC_ENDPOINTS[loadedNetwork][0], // TODO rotate within Spammer
        spamEventHandler,
    ));

    const appContext: AppContext = {
        inProgress, setInProgress,
        showMobileNav, setShowMobileNav,
        setModalContent,
        spammer, setSpammer,
        replaceKeypair,
    };

    /* Functions */

    function spamEventHandler(evt: SpamEvent): void {
        console[evt.type](`${evt.type}: ${evt.msg}`);
        setSpammerStatus(spammer.status);
    }

    function replaceKeypair(keypair: Ed25519Keypair): void {
        spammer.stop();
        setSpammer(new Spammer(
            keypair,
            spammer.client.network,
            spammer.client.rpcUrl,
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
                    <img alt="polymedia" src="https://assets.polymedia.app/img/all/logo-nomargin-transparent-512x512.webp" className="logo" />
                    SPAM
                </h1>
            </Link>

            <span id="status-indicator">
                {spammerStatus}
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
            <Link to="/user" className={selected("/user")} onClick={onClick}>
                User
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
            spammer.stop();
            setSpammer(new Spammer(
                spammer.client.signer,
                newNet,
                RPC_ENDPOINTS[newNet][0], // TODO
                spamEventHandler,
            ));
            setShowMobileNav(false);
        };
        return <NetworkSelector
            currentNetwork={spammer.client.network}
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

        <Modal content={modalContent} />
    </div>
    );
};

const GitHubLogo: React.FC = () => <svg width="25" height="25" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="#fff"/></svg>;
