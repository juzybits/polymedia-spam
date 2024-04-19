import { SuiClient, SuiObjectResponse } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { NetworkName, getSuiObjectResponseFields } from "@polymedia/suits";
import { SPAM_IDS } from "./config";
import { UserCounter } from "./types";
import { new_user_counter } from "./package";

export class SpamClient
{
    private suiClient: SuiClient;
    private packageId: string;
    // private directorId: string;

    constructor(suiClient: SuiClient, network: NetworkName) {
        const spamIds = SPAM_IDS[network];
        this.suiClient = suiClient,
        this.packageId = spamIds.packageId;
        // this.directorId = spamIds.directorId;
    }

    public async fetchUserCounters(
        owner: string,
    ): Promise<UserCounter[]> {
        const StructType = `${this.packageId}::spam::UserCounter`;
        const pageObjResp = await this.suiClient.getOwnedObjects({
            owner,
            cursor: null, // TODO handle pagination
            options: { showContent: true },
            filter: { StructType },
        });
        return pageObjResp.data.map(objResp => parseUserCounter(objResp));
    }
}

/* eslint-disable */
function parseUserCounter(
    resp: SuiObjectResponse,
): UserCounter {
    const fields = getSuiObjectResponseFields(resp);
    return {
        id: fields.id.id,
        epoch: Number(fields.epoch),
        tx_count: Number(fields.tx_count),
    };
}
/* eslint-enable */
