import { useEffect, useState } from "react";

type SpamPrice = {
    sui: number;
    usd: number;
};

const turbosPoolId = "0x1e74d37329126a52a60a340ffda7e047e175442f4df096e1b2b40c40fa5fc213";

export const usePrice = () => {
    const [price, setPrice] = useState<SpamPrice>();

    useEffect(() => {
        fetchPrice();
    }, []);

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

    return {
        price,
    };
};
