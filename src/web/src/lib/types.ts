import { UserCounters } from "@polymedia/spam-sdk";

export type SpamView = {
    events: { time: string; msg: string }[];
    counters: UserCounters;
};

export type UserBalances = {
    sui: number;
    spam: number;
};
