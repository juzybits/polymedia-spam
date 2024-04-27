import { SpamStatus, UserCounters } from "@polymedia/spam-sdk";

export type SpamView = {
    status: SpamStatus;
    events: string[];
    counters: UserCounters;
};

export type UserBalances = {
    sui: number;
    spam: number;
};
