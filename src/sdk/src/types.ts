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
