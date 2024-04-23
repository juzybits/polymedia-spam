import { SpamStatus, UserData } from "@polymedia/spam-sdk";

export type SpamView = {
    status: SpamStatus;
    lastMessage: string;
    epoch: number;
    userData: UserData;
};
