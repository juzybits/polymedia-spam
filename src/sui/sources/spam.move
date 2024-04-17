module spam::spam
{
    // === Imports ===

    use std::option::{Self};
    use sui::coin::{Self, TreasuryCap};
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::transfer::{Self};
    use sui::tx_context::{TxContext};

    // === Friends ===

    // === Errors ===

    // === Constants ===

    // === Structs ===

    struct SPAM has drop {}

    /// one-off shared object used to coordinate state and mint coins
    struct Director has key, store {
        id: UID,
        treasury: TreasuryCap<SPAM>,
        epoch_counters: Table<u64, EpochCounter>,
        txn_count: u64,
    }

    /// can only exist inside Director.epoch_counters
    struct EpochCounter has store {
        epoch: u64,
        user_counts: Table<address, u64>,
        txn_count: u64,
    }

    /// non transferable owned object tied to one user address
    struct UserCounter has key {
        id: UID,
        epoch: u64,
        txn_count: u64,
    }

    // === Public-Mutative Functions ===

    // === Public-View Functions ===

    // === Admin Functions ===

    // === Public-Friend Functions ===

    // === Private Functions ===

    fun init(witness: SPAM, ctx: &mut TxContext)
    {
        // Create the coin
        let (treasury, metadata) = coin::create_currency(
            witness,
            0, // decimals
            b"SPAM", // symbol
            b"SPAM", // name
            b"The original Proof of Spam coin", // description
            option::none(),// icon_url TODO
            ctx,
        );

        // Freeze the metadata
        transfer::public_freeze_object(metadata);

        // Create the only Director that will ever exist
        let director = Director {
            id: object::new(ctx),
            treasury,
            epoch_counters: table::new(ctx),
            txn_count: 0
        };

        transfer::share_object(director);
    }

    // === Test Functions ===
}
