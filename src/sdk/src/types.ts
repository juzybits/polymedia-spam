/* 1:1 representations of Sui structs */

export type Director = {
    id: string;
    paused: boolean;
    tx_count: number;
    treasury: string;
    epoch_counters: Map<number, string>;
};

export type EpochCounter = {
    epoch: number;
    tx_count: number;
    user_counts: Map<string, number>;
};

export type UserCounter = {
    id: string;
    epoch: number;
    tx_count: number;
    registered: boolean;
};

export type Stats = {
    epoch: number;
    paused: boolean;
    tx_count: number;
    supply: number;
    epochs: EpochStats[];
};

export type EpochStats = {
    epoch: number;
    tx_count: number;
    user_count: number;
};

/* Other types */

export type UserData = {
    epoch: number,
    balances: {
        spam: number;
        sui: number;
    };
    counters: {
        current: UserCounter|null;
        register: UserCounter|null;
        claim: UserCounter[];
        delete: UserCounter[];
    };
};
