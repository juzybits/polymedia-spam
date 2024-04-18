module spam::spam
{
    // === Imports ===

    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::table::{Self, Table};
    use sui::tx_context::{epoch, sender};

    // === Friends ===

    // === Errors ===

    const EWrongEpoch: u64 = 100;

    // === Constants ===

    const TOTAL_EPOCH_REWARD: u64 = 1_000_000_000;

    // === Structs ===

    public struct SPAM has drop {}

    /// Singleton shared object to coordinate state and to mint coins.
    public struct Director has key, store {
        id: UID,
        treasury: TreasuryCap<SPAM>,
        epoch_counters: Table<u64, EpochCounter>, // keys are epochs
        tx_count: u64,
    }

    /// Can only exist inside the Director.epoch_counters table.
    /// Tracks how many tx blocks each user completed in one epoch.
    public struct EpochCounter has store {
        epoch: u64,
        user_counts: Table<address, u64>,
        tx_count: u64,
    }

    /// Non transferable owned object tied to a user address.
    /// Tracks how many tx blocks the user completed in one epoch.
    public struct UserCounter has key {
        id: UID,
        epoch: u64,
        tx_count: u64,
    }

    // === Public-Mutative Functions ===

    /// Users can create multiple counters per epoch, but it is pointless
    /// because they can only register() one of them.
    public fun new_user_counter(
        ctx: &mut TxContext,
    ): UserCounter {
        return UserCounter {
            id: object::new(ctx),
            epoch: epoch(ctx),
            tx_count: 1, // count the transaction
        }
    }

    public fun destroy_user_counter(
        user_counter: UserCounter,
    ) {
        let UserCounter { id, epoch: _epoch, tx_count: _tx_count} = user_counter;
        sui::object::delete(id);
    }

    /// Users can only register their counter during the 1st epoch after UserCounter.epoch.
    ///
    /// Users can only register one UserCounter per epoch because
    /// user_counts.add() aborts with sui::dynamic_field::EFieldAlreadyExists.
    public fun register(
        director: &mut Director,
        user_counter: UserCounter,
        ctx: &mut TxContext,
    ) {
        let previous_epoch = epoch(ctx) - 1;
        assert!(user_counter.epoch == previous_epoch, EWrongEpoch);

        let sender_addr = sender(ctx);
        let epoch_counter = get_or_create_epoch_counter(director, previous_epoch, ctx);

        epoch_counter.user_counts.add(sender_addr, user_counter.tx_count);

        destroy_user_counter(user_counter);
    }

    /// Users can only claim their rewards from the 2nd epoch after UserCounter.epoch.
    /// User rewards are proportional to their share of completed txs in the epoch.
    public fun claim(
        director: &mut Director,
        epoch: u64,
        ctx: &mut TxContext,
    ): Coin<SPAM> {
        let max_allowed_epoch = epoch(ctx) - 2;
        assert!(epoch <= max_allowed_epoch, EWrongEpoch);

        let epoch_counter = director.epoch_counters.borrow_mut(epoch);
        // we can safely remove the user from the EpochCounter because
        // users can no longer register() their UserCounter for that epoch
        let user_txs = epoch_counter.user_counts.remove(sender(ctx));
        let user_reward = (user_txs * TOTAL_EPOCH_REWARD) / epoch_counter.tx_count;

        let coin = director.treasury.mint(user_reward, ctx);
        return coin
    }

    // === Entry functions ===

    /// Users can only increase their tx counter for the current epoch.
    /// Users can only call this function once per tx block.
    entry fun increment_user_counter(
        user_counter: &mut UserCounter,
        ctx: &TxContext,
    ) {
        let current_epoch = epoch(ctx);
        assert!(user_counter.epoch == current_epoch, EWrongEpoch);

        user_counter.tx_count = user_counter.tx_count + 1;
    }

    // === Private functions ===

    fun get_or_create_epoch_counter(
        director: &mut Director,
        epoch: u64,
        ctx: &mut TxContext,
    ): &mut EpochCounter {
        if ( !director.epoch_counters.contains(epoch) ) {
            let epoch_counter = EpochCounter {
                epoch,
                user_counts: table::new(ctx),
                tx_count: 0,
            };
            director.epoch_counters.add(epoch, epoch_counter);
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
