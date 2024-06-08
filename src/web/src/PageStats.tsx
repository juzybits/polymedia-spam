import { SPAM_DECIMALS, Stats } from "@polymedia/spam-sdk";
import { NetworkName, convertBigIntToNumber, formatNumber } from "@polymedia/suitcase-core";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { EpochData, formatEpochPeriod, getEpochTimes } from "./lib/epochs";

type SpamPrice = {
    sui: number;
    usd: number;
};

const turbosPoolId = "0x1e74d37329126a52a60a340ffda7e047e175442f4df096e1b2b40c40fa5fc213";
const newSupplyPerEpoch = 1_000_000_000;
const firstEpoch: Record<NetworkName, number> = {
    mainnet: 386,
    testnet: 357,
    devnet: 0,
    localnet: 0,
};

export const PageStats: React.FC = () =>
{
    /* State */

    const { network, spammer } = useOutletContext<AppContext>();
    const [ stats, setStats ] = useState<Stats>();
    const [ currEpoch, setCurrEpoch ] = useState<EpochData>();
    const [ gasPerTx, setGasPerTx ] = useState<number>(0.000774244);
    const [ price, setPrice ] = useState<SpamPrice>();

    /* Functions */

    useEffect(() => {
        fetchStats();
        fetchCurrEpoch();
        fetchGasPerTx();
        fetchPrice();
    }, [spammer.current, network]);

    const fetchStats = async () => {
        try {
            setStats(undefined);
            let newStats: Stats;
            if (network === "mainnet") {
                newStats = await spammer.current.getSpamClient().fetchStatsForSpecificEpochs([
                    422,421,420,419,418,417,416,415,414,413,412,411,410,409,408,407,406,405,404,
                    403,402,401,400,399,398,397,396,395,394,393,392,391,390,389,388,387,386,
                ]);
            } else {
                newStats = await spammer.current.getSpamClient().fetchStatsForRecentEpochs(40);
                // Prepend a synthetic epoch counter for the current epoch
                newStats.epochs.unshift({
                    epoch: newStats.epoch,
                    tx_count: "0",
                });
            }
            setStats(newStats);
        } catch (err) {
            console.warn(`[fetchStats] ${err}`);
        }
    };

    const fetchCurrEpoch = async () => {
        try {
            setCurrEpoch(undefined);
            const suiState = await spammer.current.getSuiClient().getLatestSuiSystemState();
            setCurrEpoch({
                epochNumber: Number(suiState.epoch),
                durationMs: Number(suiState.epochDurationMs),
                startTimeMs: Number(suiState.epochStartTimestampMs),
            });
        } catch (err) {
            console.warn(`[fetchCurrEpoch] ${err}`);
        }
    };

    const fetchGasPerTx = async () => {
        try {
            const newGasPerTx = await spammer.current.getSpamClient().fetchGasCostOfIncrementTx();
            setGasPerTx(newGasPerTx);
        } catch (err) {
            console.warn(`[fetchGasPerTx] ${err}`);
        }
    };

    const fetchPrice = async () => {
        try {
            const resp = await fetch(`https://api.dexscreener.com/latest/dex/pairs/sui/${turbosPoolId}`);
            if (resp.ok) {
                /* eslint-disable */
                const data = await resp.json();
                setPrice({
                    sui: data.pair.priceNative,
                    usd: data.pair.priceUsd,
                });
                /* eslint-enable */
            } else {
                throw Error("API response not okay");
            }
        } catch (err) {
            console.warn(`[fetchPrice] ${err}`);
        }
    };

    /* HTML */

    const CounterCard: React.FC<{
        epoch: { epoch: string; tx_count: string };
        currentEpoch: number;
    }> = ({
        epoch,
        currentEpoch,
    }) => {
        const epochNumber = Number(epoch.epoch);
        if (epochNumber < firstEpoch[network]) {
            return null;
        }
        const epochTimes = currEpoch && getEpochTimes(epochNumber, currEpoch);
        const epochTxs = Number(epoch.tx_count);
        const epochGas = epochTxs * gasPerTx;
        const spamPerTx = newSupplyPerEpoch / epochTxs;
        const suiPerSpam = epochGas / newSupplyPerEpoch;

        let epochType: "current" | "register" | "claim";
        if (epochNumber === currentEpoch) {
            epochType = "current";
        } else if (epochNumber === currentEpoch - 1) {
            epochType = "register";
        } else {
            epochType = "claim";
        }

        return <div className={`counter-card ${epochType}`}>
            <div>
                <div className="counter-epoch">Epoch {epoch.epoch}</div>
                <div>{(() => {
                    if (epochType === "current") {
                        return "spamming now";
                    }
                    if (epochType === "register") {
                        return "registering now";
                    }
                    return "claimable";
                })()}</div>
            </div>

            {epochTimes &&
            <div>
                <div>
                    {formatEpochPeriod(epochTimes.startTime, epochTimes.endTime, false)}
                </div>
            </div>
            }

            <div>
                <div>
                    {(() => {
                        if (epochType === "current") {
                            return "Txs in epoch: ongoing";
                        }
                        if (epochType === "register") {
                            return `Txs in epoch: ${formatNumber(epochTxs)} (so far)`;
                        }
                        return `Txs in epoch: ${formatNumber(epochTxs)}`;
                    })()}
                </div>
            </div>

            {Number.isFinite(spamPerTx) &&
            <div>
                <div>
                    SPAM mined per tx: {formatNumber(spamPerTx)}
                </div>
            </div>
            }

            {epochGas > 0 &&
            <div>
                <div>
                    Gas paid in epoch: {formatNumber(epochGas)} SUI
                </div>
            </div>
            }

            {suiPerSpam > 0 &&
            <div>
                <div>
                    Gas cost per SPAM: {suiPerSpam.toFixed(8)} SUI
                </div>
            </div>
            }
        </div>;
    };

    const heading = <h1><span className="rainbow">Stats</span></h1>;

    if (!stats) {
        return <>
            {heading}
            <p>Loading...</p>
        </>;
    }

    const epochsCompleted = Number(stats.epoch) - 1 - firstEpoch[network];
    const totalTxs = Number(stats.tx_count);
    const totalGas = totalTxs * gasPerTx;
    const claimedSupply = convertBigIntToNumber(BigInt(stats.supply), SPAM_DECIMALS);
    const claimableSupply = epochsCompleted * newSupplyPerEpoch;
    const dailyInflation = newSupplyPerEpoch / claimableSupply * 100;

    return <>
        {heading}
        <div className="tight">
            <p>Total transactions: {formatNumber(totalTxs)}</p>
            <p>Total gas paid: {formatNumber(totalGas, "compact")} SUI</p>
            {network !== "mainnet" &&
                <p>Daily inflation: {dailyInflation.toFixed(2)}%</p>
            }
            {price && <>
                <p>SPAM/SUI: {price.sui}</p>
                <p>SPAM/USD: {price.usd}</p>
                <p>Supply: {formatNumber(claimableSupply, "compact")} ({formatNumber(claimedSupply, "compact")} claimed)</p>
                <p>Market cap : ${formatNumber(price.usd * claimableSupply)} (${formatNumber(price.usd * claimedSupply)} claimed)</p>
            </>
            }
            {/* <p>Current epoch: {stats.epoch}</p> */}
            {/* <p>Epochs completed: {epochsCompleted}</p> */}
            {/* <p>System status: {stats.paused ? "paused" : "running"}</p> */}
        </div>

        {stats.epochs.length > 0 &&
        <>
            <br/>
            <h2>Epochs:</h2>

            <div className="counter-cards">
                {stats.epochs.map(epoch =>
                    <CounterCard epoch={epoch} currentEpoch={Number(stats.epoch)} key={epoch.epoch} />
                )}
            </div>
        </>}
    </>;
};
