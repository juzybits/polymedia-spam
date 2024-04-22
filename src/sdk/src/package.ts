import { SuiObjectRef } from "@mysten/sui.js/client";
import {
    TransactionBlock,
    TransactionResult,
} from "@mysten/sui.js/transactions";

export function new_user_counter(
    txb: TransactionBlock,
    packageId: string,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::spam::new_user_counter`,
        arguments: [],
    });
}

export function increment_user_counter(
    txb: TransactionBlock,
    packageId: string,
    userCounterRef: SuiObjectRef,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::spam::increment_user_counter`,
        arguments: [
            txb.objectRef(userCounterRef),
        ],
    });
}

export function destroy_user_counter(
    txb: TransactionBlock,
    packageId: string,
    userCounterId: string,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::spam::destroy_user_counter`,
        arguments: [
            txb.object(userCounterId),
        ],
    });
}

export function register_user_counter(
    txb: TransactionBlock,
    packageId: string,
    directorId: string,
    userCounterId: string,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::spam::register_user_counter`,
        arguments: [
            txb.object(directorId),
            txb.object(userCounterId),
        ],
    });
}

export function claim_user_counter(
    txb: TransactionBlock,
    packageId: string,
    directorId: string,
    userCounterId: string,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::spam::claim_user_counter`,
        arguments: [
            txb.object(directorId),
            txb.object(userCounterId),
        ],
    });
}

export function stats_for_specific_epochs(
    txb: TransactionBlock,
    packageId: string,
    directorId: string,
    epochNumbers: number[],
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::spam::stats_for_specific_epochs`,
        arguments: [
            txb.object(directorId),
            txb.pure(epochNumbers),
        ],
    });
}

export function stats_for_recent_epochs(
    txb: TransactionBlock,
    packageId: string,
    directorId: string,
    epochCount: number,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::spam::stats_for_recent_epochs`,
        arguments: [
            txb.object(directorId),
            txb.pure(epochCount),
        ],
    });
}
