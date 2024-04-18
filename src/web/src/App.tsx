import {
    SuiClientProvider,
    createNetworkConfig,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui.js/client";
import { LinkExternal, Modal, NetworkSelector, loadNetwork } from "@polymedia/webutils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { PageHome } from "./PageHome";
import { PageNotFound } from "./PageNotFound";
import "./styles/App.less";

/* App router */

export const AppRouter: React.FC = () => {
    return (
    <BrowserRouter>
        <Routes>
            <Route path='/' element={<AppSuiProviders />} >
                <Route index element={<PageHome />} />
                <Route path='*' element={<PageNotFound />} />
            </Route>
        </Routes>
    </BrowserRouter>
    );
}

/* Sui providers + network config */

const supportedNetworks = ["mainnet", "testnet", "devnet", "localnet"] as const;
export type NetworkName = typeof supportedNetworks[number];

const { networkConfig } = createNetworkConfig({
    localnet: { url: getFullnodeUrl("localnet") },
    devnet: { url: getFullnodeUrl("devnet") },
    testnet: { url: getFullnodeUrl("testnet") },
    mainnet: { url: "https://mainnet.suiet.app" },
});

const queryClient = new QueryClient();
const AppSuiProviders: React.FC = () => {
    const [network, setNetwork] = useState(loadNetwork(supportedNetworks, "mainnet"));
    return (
    <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} network={network}>
            {/* <WalletProvider autoConnect={true}> */}
                <App network={network} setNetwork={setNetwork} />
            {/* </WalletProvider> */}
        </SuiClientProvider>
    </QueryClientProvider>
    );
}

/* App */

export type ReactSetter<T> = React.Dispatch<React.SetStateAction<T>>;

export type AppContext = {
    inProgress: boolean, setInProgress: ReactSetter<boolean>,
    network: NetworkName, setNetwork: ReactSetter<NetworkName>,
    showMobileNav: boolean, setShowMobileNav: ReactSetter<boolean>,
    setModalContent: ReactSetter<ReactNode>,
    // openConnectModal: () => void,
};

const App: React.FC<{
    network: NetworkName,
    setNetwork: ReactSetter<NetworkName>,
}> = ({
    network,
    setNetwork,
}) =>
{
    const [ inProgress, setInProgress ] = useState(false);
    // const [ showConnectModal, setShowConnectModal ] = useState(false);
    const [ showMobileNav, setShowMobileNav ] = useState(false);
    const [ modalContent, setModalContent ] = useState<ReactNode>(null);

    const appContext: AppContext = {
        inProgress, setInProgress,
        network, setNetwork,
        showMobileNav, setShowMobileNav,
        setModalContent,
        // openConnectModal: () => { setShowConnectModal(true) },
    };

    const layoutClasses: string[] = [];
    if (showMobileNav) {
        layoutClasses.push("menu-open");
    }
    if (inProgress) {
        layoutClasses.push("disabled");
    }

    return (
    <div id='layout' className={layoutClasses.join(" ")}>

        <div>
            <Header appContext={appContext} />

            <div id='nav-and-page'>
                <Nav appContext={appContext} />

                <div id='page'>
                    <Outlet context={appContext} /> {/* Loads a Page*.tsx */}
                </div>
            </div>
        </div>

        <Footer />

        {/* Floating elements */}

        <BtnMenu appContext={appContext} />

        <Modal content={modalContent} />

        {/*
        <ConnectModal
            trigger={<></>}
            open={showConnectModal}
            onOpenChange={isOpen => { setShowConnectModal(isOpen) }}
        />
        */}

    </div>
    );
}

/* One-off components */

/*
Shared by the following Polymedia projects:
- Send
- Spam
*/

const Header: React.FC<{
    appContext: AppContext,
}> = ({
    appContext: app,
}) =>
{
    return <header>
        <Link to='/' onClick={e => { app.inProgress ? e.preventDefault() : undefined }}>
            <h1>
                <img alt='polymedia' src='https://assets.polymedia.app/img/all/logo-nomargin-transparent-512x512.webp' className='logo' />
                SPAM
            </h1>
        </Link>

        {/* <BtnConnect appContext={app} /> */}
    </header>;
}

const Nav: React.FC<{
    appContext: AppContext,
}> = ({
    appContext: app,
}) =>
{
    const closeMobileNav = () => {
        app.setShowMobileNav(false);
    };

    const location = useLocation();
    const selected = (name: string) => location.pathname === name ? "selected" : "";
    const onClick: React.MouseEventHandler = (e) => {
        app.inProgress ? e.preventDefault() : closeMobileNav()
    };

    return <nav>
        <Link to='/' className={selected("/")} onClick={onClick}>
            Home
        </Link>

        <div className='divider' />

        <BtnNetwork appContext={app} />
    </nav>;
}

const BtnNetwork: React.FC<{
    appContext: AppContext,
}> = ({
    appContext: app,
}) =>
{
    const onSwitchNetwork = (newNet: NetworkName) => {
        app.setNetwork(newNet);
        app.setShowMobileNav(false);
    };
    return <NetworkSelector
        currentNetwork={app.network}
        supportedNetworks={supportedNetworks}
        onSwitch={onSwitchNetwork}
        disabled={app.inProgress}
    />;
}

/*
const BtnConnect: React.FC<{
    appContext: AppContext,
}> = ({
    appContext: app,
}) =>
{
    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const onClick = () => {
            currAcct ? disconnect() : app.openConnectModal();
            app.setShowMobileNav(false);
    };

    const text = currAcct ? shortenSuiAddress(currAcct.address, 3, 3) : "LOG IN";

    return <button
        className='btn-connect'
        disabled={app.inProgress}
        onClick={onClick}
    >
        {text}
    </button>;
}
*/

const BtnMenu: React.FC<{
    appContext: AppContext,
}> = ({
    appContext: app,
}) =>
{
    return <button
        id='btn-menu'
        disabled={app.inProgress}
        onClick={() => { app.setShowMobileNav(!app.showMobileNav) }}
    >
        {!app.showMobileNav ? "MENU" : "CLOSE"}
    </button>
}

const Footer: React.FC = () =>
{
    return <footer>
        <div id='icons'>
            <LinkExternal href='https://polymedia.app' follow={true}>
                <img alt='polymedia' src='https://assets.polymedia.app/img/all/logo-nomargin-transparent-512x512.webp' className='icon' />
            </LinkExternal>
            <LinkExternal href='https://github.com/juzybits/polymedia-spam' follow={true}>
                <GitHubLogo />
            </LinkExternal>
        </div>
    </footer>;
}

const GitHubLogo: React.FC = () => <svg width='25' height='25' viewBox='0 0 98 96' xmlns='http://www.w3.org/2000/svg'><path fillRule='evenodd' clipRule='evenodd' d='M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z' fill='#fff'/></svg>;
