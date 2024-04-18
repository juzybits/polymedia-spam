module spam::spam
{
    // === Imports ===

    use sui::coin::{Self, TreasuryCap};
    use sui::table::{Self, Table};
    use sui::tx_context::{epoch, sender};

    // === Friends ===

    // === Errors ===

    const EWrongEpoch: u64 = 100;

    // === Constants ===

    const TOTAL_EPOCH_REWARD: u64 = 1_000_000_000;

    // === Structs ===

    public struct SPAM has drop {}

    /// singleton shared object used to coordinate state and to mint coins
    public struct Director has key, store {
        id: UID,
        treasury: TreasuryCap<SPAM>,
        epoch_counters: Table<u64, EpochCounter>,
        tx_count: u64,
    }

    /// can only exist inside Director.epoch_counters
    public struct EpochCounter has store {
        epoch: u64,
        user_counts: Table<address, u64>,
        tx_count: u64,
    }

    /// non transferable owned object tied to one user address
    public struct UserCounter has key {
        id: UID,
        epoch: u64,
        tx_count: u64,
    }

    // === Public-Mutative Functions ===

    public fun destroy_user_counter(
        usr_ctr: UserCounter,
    ) {
        let UserCounter { id, epoch: _epoch, tx_count: _tx_count} = usr_ctr;
        sui::object::delete(id);
    }

    // === Entry functions ===

    entry fun new_user_counter(
        ctx: &mut TxContext,
    ) {
        let usr_ctr = UserCounter {
            id: object::new(ctx),
            epoch: epoch(ctx),
            tx_count: 1, // count the txn
        };
        transfer::transfer(usr_ctr, sender(ctx));
    }

    entry fun spam(
        usr_ctr: &mut UserCounter,
        ctx: &TxContext,
    ) {
        let allowed_epoch = epoch(ctx);
        assert!(usr_ctr.epoch == allowed_epoch, EWrongEpoch);

        usr_ctr.tx_count = usr_ctr.tx_count + 1;
    }

    entry fun register(
        director: &mut Director,
        usr_ctr: UserCounter,
        ctx: &mut TxContext,
    ) {
        let allowed_epoch = epoch(ctx) - 1;
        assert!(usr_ctr.epoch == allowed_epoch, EWrongEpoch);

        let sender_addr = sender(ctx);
        let epo_ctr = get_or_create_epoch_counter(director, usr_ctr.epoch, ctx);

        // add the user count to the EpochCounter
        epo_ctr.user_counts.add(sender_addr, usr_ctr.tx_count);

        destroy_user_counter(usr_ctr);
    }

    entry fun claim(
        director: &mut Director,
        epoch: u64,
        ctx: &mut TxContext,
    ) {
        let max_allowed_epoch = epoch(ctx) - 2;
        assert!(epoch <= max_allowed_epoch, EWrongEpoch);

        let epo_ctr = director.epoch_counters.borrow_mut(epoch);
        let usr_txs = epo_ctr.user_counts.remove(sender(ctx));
        let usr_amount = (usr_txs * TOTAL_EPOCH_REWARD) / epo_ctr.tx_count;

        let coin = director.treasury.mint(usr_amount, ctx);
        transfer::public_transfer(coin, sender(ctx));
    }

    // === Private functions ===

    fun get_or_create_epoch_counter(
        director: &mut Director,
        epoch: u64,
        ctx: &mut TxContext,
    ): &mut EpochCounter {
        if ( !director.epoch_counters.contains(epoch) ) {
            let epo_ctr = EpochCounter {
                epoch,
                user_counts: table::new(ctx),
                tx_count: 0,
            };
            director.epoch_counters.add(epoch, epo_ctr);
        };
        return director.epoch_counters.borrow_mut(epoch)
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
            tx_count: 0
        };

        transfer::share_object(director);
    }

    // === Test Functions ===
}
