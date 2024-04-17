module spam::spam
{
    // === Imports ===

    use std::option::{Self};
    use sui::coin::{Self, TreasuryCap};
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::transfer::{Self};
    use sui::tx_context::{TxContext, epoch, sender};

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

    // === Entry functions ===

    entry fun new_user_counter(
        ctx: &mut TxContext,
    ) {
        let usr_ctr = UserCounter {
            id: object::new(ctx),
            epoch: epoch(ctx),
            txn_count: 1,
        };
        transfer::transfer(usr_ctr, sender(ctx));
    }

    entry fun spam(
        usr_ctr: &mut UserCounter,
        ctx: &TxContext,
    ) {
        let allowed_epoch = epoch(ctx);
        assert!(usr_ctr.epoch == allowed_epoch, 0);

        usr_ctr.txn_count = usr_ctr.txn_count + 1;
    }

    entry fun register(
        director: &mut Director,
        usr_ctr: UserCounter,
        ctx: &mut TxContext,
    ) {
        let allowed_epoch = epoch(ctx) - 1;
        assert!(usr_ctr.epoch == allowed_epoch, 0);

        let sender_addr = sender(ctx);
        let epo_ctr = get_or_create_epoch_counter(director, usr_ctr.epoch, ctx);
        // if ( table::contains(&epo_ctr.user_counts, sender(ctx)) ) { // TODO: keep the one with highest value
        // };

        // add the user count to the EpochCounter
        table::add(&mut epo_ctr.user_counts, sender_addr, usr_ctr.txn_count);

        // destroy the UserCounter
        let UserCounter { id, epoch: _epoch, txn_count: _txn_count} = usr_ctr;
        sui::object::delete(id);

    }

    // === Private functions ===

    fun get_or_create_epoch_counter(
        director: &mut Director,
        epoch: u64,
        ctx: &mut TxContext,
    ): &mut EpochCounter {
        if ( !table::contains(&director.epoch_counters, epoch) ) {
            let epo_ctr = EpochCounter {
                epoch,
                user_counts: table::new(ctx),
                txn_count: 0,
            };
            table::add(&mut director.epoch_counters, epoch, epo_ctr);
        };
        return table::borrow_mut(&mut director.epoch_counters, epoch)
    }

    // === Initialization ===

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
