import { SuiClient, SuiObjectResponse } from "@mysten/sui.js/client";
import { UserCounter } from "./types";
import { getSuiObjectResponseFields } from "@polymedia/suits";

export async function fetchUserCounters(
    suiClient: SuiClient,
    packageId: string,
    owner: string,
): Promise<UserCounter[]> {
    const StructType = `${packageId}::spam::UserCounter`;
    const pageObjResp = await suiClient.getOwnedObjects({
        owner,
        cursor: null, // TODO handle pagination
        options: { showContent: true },
        filter: { StructType },
    });
    return pageObjResp.data.map(objResp => parseUserCounter(objResp));
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
