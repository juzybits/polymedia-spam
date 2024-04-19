export type Director = {
    id: string;
    treasury: string;
    epoch_counters: Map<number, string>;
    tx_count: number;
    paused: boolean;
};

export type EpochCounter = {
    epoch: number;
    user_counts: Map<string, number>;
    tx_count: number;
};

export type UserCounter = {
    id: string;
    epoch: number;
    tx_count: number;
};
