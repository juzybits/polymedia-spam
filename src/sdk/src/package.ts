import { bcs } from "@mysten/sui/bcs";
import { SuiObjectRef } from "@mysten/sui/client";
import {
    Transaction,
    TransactionResult,
} from "@mysten/sui/transactions";
import { SPAM_MODULE } from "./config.js";

export function new_user_counter(
    tx: Transaction,
    packageId: string,
    directorId: string,
): TransactionResult {
    return tx.moveCall({
        target: `${packageId}::${SPAM_MODULE}::new_user_counter`,
        arguments: [
            tx.object(directorId),
        ],
    });
}

export function increment_user_counter(
    tx: Transaction,
    packageId: string,
    userCounterRef: SuiObjectRef,
): TransactionResult {
    return tx.moveCall({
        target: `${packageId}::${SPAM_MODULE}::increment_user_counter`,
        arguments: [
            tx.objectRef(userCounterRef),
        ],
    });
}

export function destroy_user_counter(
    tx: Transaction,
    packageId: string,
    userCounterId: string,
): TransactionResult {
    return tx.moveCall({
        target: `${packageId}::${SPAM_MODULE}::destroy_user_counter`,
        arguments: [
            tx.object(userCounterId),
        ],
    });
}

export function register_user_counter(
    tx: Transaction,
    packageId: string,
    directorId: string,
    userCounterId: string,
): TransactionResult {
    return tx.moveCall({
        target: `${packageId}::${SPAM_MODULE}::register_user_counter`,
        arguments: [
            tx.object(directorId),
            tx.object(userCounterId),
        ],
    });
}

export function claim_user_counter(
    tx: Transaction,
    packageId: string,
    directorId: string,
    userCounterId: string,
): TransactionResult {
    return tx.moveCall({
        target: `${packageId}::${SPAM_MODULE}::claim_user_counter`,
        arguments: [
            tx.object(directorId),
            tx.object(userCounterId),
        ],
    });
}

export function stats_for_specific_epochs(
    tx: Transaction,
    packageId: string,
    directorId: string,
    epochNumbers: number[],
): TransactionResult {
    return tx.moveCall({
        target: `${packageId}::${SPAM_MODULE}::stats_for_specific_epochs`,
        arguments: [
            tx.object(directorId),
            tx.pure(bcs.vector(bcs.U64).serialize(epochNumbers)),
        ],
    });
}

export function stats_for_recent_epochs(
    tx: Transaction,
    packageId: string,
    directorId: string,
    epochCount: number,
): TransactionResult {
    return tx.moveCall({
        target: `${packageId}::${SPAM_MODULE}::stats_for_recent_epochs`,
        arguments: [
            tx.object(directorId),
            tx.pure.u64(epochCount),
        ],
    });
}
