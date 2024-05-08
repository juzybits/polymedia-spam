import { SPAM_DECIMALS, Stats } from "@polymedia/spam-sdk";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AppContext } from "./App";
import { formatBigInt, formatNumber } from "@polymedia/suits";
import { EpochData, formatEpochPeriod, getEpochTimes } from "./lib/epochs";

export const PageStats: React.FC = () =>
{
    const { network, spammer } = useOutletContext<AppContext>();
    const [ stats, setStats ] = useState<Stats>();
    const [ currEpoch, setCurrEpoch ] = useState<EpochData>();

    useEffect(() => {
        updateStats();
        updateCurrEpoch();
    }, [spammer.current, network]);

    const updateStats = async () => {
        try {
            setStats(undefined);
            const newStats = await spammer.current.getSpamClient().fetchStatsForRecentEpochs(6);
            // Prepend a synthetic epoch counter for the current epoch
            newStats.epochs.unshift({
                epoch: newStats.epoch,
                tx_count: "0",
            });
            setStats(newStats);
        } catch (err) {
            console.warn("stats update failed");
        }
    };

    const updateCurrEpoch = async () => {
        try {
            setCurrEpoch(undefined);
            const suiState = await spammer.current.getSuiClient().getLatestSuiSystemState();
            setCurrEpoch({
                epochNumber: Number(suiState.epoch),
                durationMs: Number(suiState.epochDurationMs),
                startTimeMs: Number(suiState.epochStartTimestampMs),
            });
        } catch (err) {
            console.warn("epoch update failed");
        }
    };

    const CounterCard: React.FC<{
        epoch: { epoch: string; tx_count: string };
    }> = ({
        epoch,
    }) => {
        const epochNumber = Number(epoch.epoch);
        const epochTimes = currEpoch && getEpochTimes(epochNumber, currEpoch);

        let cardClass: "" | "current" | "register" | "claim";
        let transactions: string;
        if (!currEpoch) {
            cardClass = "";
            transactions = "";
        } else if (epochNumber === currEpoch.epochNumber) {
            cardClass = "current";
            transactions = "Users are spamming transactions right now";
        } else if (epochNumber === currEpoch.epochNumber - 1) {
            cardClass = "register";
            transactions = `${formatNumber(Number(epoch.tx_count), "compact")} transactions registered so far`;
        } else {
            cardClass = "claim";
            transactions = `${formatNumber(Number(epoch.tx_count), "compact")} transactions`;
        }

        return <div className={`counter-card ${cardClass}`}>
            <div>
                <div className="counter-epoch">Epoch {epoch.epoch}</div>
            </div>

            <div>
                <div>
                    {transactions}
                </div>
            </div>

            {epochTimes &&
            <div>
                <div>
                    {formatEpochPeriod(epochTimes.startTime, epochTimes.endTime, false)}
                </div>
            </div>
            }
        </div>;
    };

    return <>
        <h1><span className="rainbow">Stats</span></h1>
        {!stats
        ? <p>Loading...</p>
        : <>
            <div className="tight">
                <p>Total transactions: {formatNumber(Number(stats.tx_count), "compact")}</p>
                <p>Circulating supply: {formatBigInt(BigInt(stats.supply), SPAM_DECIMALS, "compact")}</p>
                <p>Current epoch: {stats.epoch}</p>
                {/* <p>System status: {stats.paused ? "paused" : "running"}</p> */}
            </div>

            {stats.epochs.length > 0 &&
            <>
                <br/>
                <h2>Epochs:</h2>

                <div className="counter-cards">
                    {stats.epochs.map(epoch =>
                        <CounterCard epoch={epoch} key={epoch.epoch} />
                    )}
                </div>
            </>}
        </>}
    </>;
};
