import { SuiObjectRef } from "@mysten/sui/client";
import {
    Transaction,
    TransactionResult,
} from "@mysten/sui/transactions";
import { SPAM_MODULE } from "./config.js";

export function new_user_counter(
    txb: Transaction,
    packageId: string,
    directorId: string,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::${SPAM_MODULE}::new_user_counter`,
        arguments: [
            txb.object(directorId),
        ],
    });
}

export function increment_user_counter(
    txb: Transaction,
    packageId: string,
    userCounterRef: SuiObjectRef,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::${SPAM_MODULE}::increment_user_counter`,
        arguments: [
            txb.objectRef(userCounterRef),
        ],
    });
}

export function destroy_user_counter(
    txb: Transaction,
    packageId: string,
    userCounterId: string,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::${SPAM_MODULE}::destroy_user_counter`,
        arguments: [
            txb.object(userCounterId),
        ],
    });
}

export function register_user_counter(
    txb: Transaction,
    packageId: string,
    directorId: string,
    userCounterId: string,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::${SPAM_MODULE}::register_user_counter`,
        arguments: [
            txb.object(directorId),
            txb.object(userCounterId),
        ],
    });
}

export function claim_user_counter(
    txb: Transaction,
    packageId: string,
    directorId: string,
    userCounterId: string,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::${SPAM_MODULE}::claim_user_counter`,
        arguments: [
            txb.object(directorId),
            txb.object(userCounterId),
        ],
    });
}

export function stats_for_specific_epochs(
    txb: Transaction,
    packageId: string,
    directorId: string,
    epochNumbers: number[],
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::${SPAM_MODULE}::stats_for_specific_epochs`,
        arguments: [
            txb.object(directorId),
            txb.pure(epochNumbers),
        ],
    });
}

export function stats_for_recent_epochs(
    txb: Transaction,
    packageId: string,
    directorId: string,
    epochCount: number,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::${SPAM_MODULE}::stats_for_recent_epochs`,
        arguments: [
            txb.object(directorId),
            txb.pure(epochCount),
        ],
    });
}
