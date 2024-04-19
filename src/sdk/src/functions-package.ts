import {
    TransactionBlock,
    TransactionResult,
} from '@mysten/sui.js/transactions';

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
    userCounterId: string,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::spam::increment_user_counter`,
        arguments: [
            txb.object(userCounterId),
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

export function register(
    txb: TransactionBlock,
    packageId: string,
    directorId: string,
    userCounterId: string,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::spam::register`,
        arguments: [
            txb.object(directorId),
            txb.object(userCounterId),
        ],
    });
}

export function claim(
    txb: TransactionBlock,
    packageId: string,
    directorId: string,
    epoch: number,
): TransactionResult {
    return txb.moveCall({
        target: `${packageId}::spam::claim`,
        arguments: [
            txb.object(directorId),
            txb.pure(epoch),
        ],
    });
}
