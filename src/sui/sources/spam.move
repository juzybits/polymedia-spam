module spam::spam
{
    // === Imports ===

    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::table::{Self, Table};
    use sui::tx_context::{epoch, sender};

    // === Errors ===

    const EUserAlreadyExists: u64 = 100;
    const EDirectorIsPaused: u64 = 101;
    const ENothingToClaim: u64 = 102;

    // === Structs ===

    public struct SPAM has drop {}

    public struct AdminCap has store, key {
        id: UID,
    }

    /// Singleton shared object to coordinate state and to mint coins.
    public struct Director has key, store {
        id: UID,
        paused: bool,
        treasury: TreasuryCap<SPAM>,
        user_counters: Table<address, address>,
        epoch_txs: Table<u64, u64>,
    }

    /// Non transferable owned object tied to a user address.
    /// Tracks how many tx blocks the user completed and claimed.
    public struct UserCounter has key {
        id: UID,
        claimed_txs: u64,
        total_txs: u64,
    }

    // === Public-Mutative Functions ===

    /// Each user address can only ever create one UserCounter object.
    entry fun new_user_counter(
        director: &mut Director,
        ctx: &mut TxContext,
    ) {
        assert!( !director.user_counters.contains(sender(ctx)), EUserAlreadyExists );

        let counter_uid = object::new(ctx);
        let counter_addr = object::uid_to_address(&counter_uid);
        let counter = UserCounter {
            id: counter_uid,
            claimed_txs: 0,
            total_txs: 1, // count this tx
        };
        director.user_counters.add(sender(ctx), counter_addr);
        transfer::transfer(counter, sender(ctx));
    }

    /// Users can only call this function once per tx block.
    entry fun increment_user_counter(
        user_counter: &mut UserCounter,
    ) {
        user_counter.total_txs = user_counter.total_txs + 1;
    }

    public fun claim_user_coins(
        director: &mut Director,
        counter: &mut UserCounter,
        ctx: &mut TxContext,
    ): Coin<SPAM> {
        assert!( director.paused == false, EDirectorIsPaused );
        assert!( counter.claimed_txs < counter.total_txs, ENothingToClaim );

        counter.increment_user_counter(); // count this tx
        let reward_amount = counter.total_txs - counter.claimed_txs;
        let reward_coin = director.treasury.mint(reward_amount, ctx);
        counter.claimed_txs = counter.total_txs; // user claimed all txs
        increment_epoch_claimed_txs(director, reward_amount, ctx);

        return reward_coin
    }

    // === Private functions ===

    /// Track txs per epoch just for statistical purposes.
    fun increment_epoch_claimed_txs(
        director: &mut Director,
        amount: u64,
        ctx: &TxContext,
    ) {
        if ( !director.epoch_txs.contains(epoch(ctx)) ) {
            director.epoch_txs.add(epoch(ctx), amount);
        } else {
            let stored_amount = director.epoch_txs.borrow_mut(epoch(ctx));
            *stored_amount = *stored_amount + amount;
        };
    }

    // === Admin functions ===

    public fun admin_pause(
        director: &mut Director,
        _: &AdminCap,
    ) {
        director.paused = true;
    }

    public fun admin_resume(
        director: &mut Director,
        _: &AdminCap,
    ) {
        director.paused = false;
    }

    public fun admin_destroy(
        cap: AdminCap,
    ) {
        let AdminCap { id } = cap;
        object::delete(id);
    }

    // === Stats / Public-View Functions ===

    public struct Stats has copy, drop {
        paused: bool,
        current_epoch: u64,
        claimed_total: u64,
        claimed_epoch: vector<EpochStats>,
    }

    public struct EpochStats has copy, drop {
        epoch: u64,
        claimed_txs: u64,
    }

    /// Get Stats for the Director and selected epochs.
    /// Epochs without an EpochCounter are represented with tx_count=0 and user_count=0.
    public fun stats_for_specific_epochs(
        director: &Director,
        epochs: vector<u64>,
        ctx: &TxContext,
    ): Stats {
        let mut epoch_stats = vector<EpochStats>[];
        let mut i = 0;
        let count = epochs.length();
        while (i < count) {
            let epoch = *epochs.borrow(i);
            if ( director.epoch_txs.contains(epoch) ) {
                let claimed_txs = *director.epoch_txs.borrow(epoch);
                let stats = EpochStats { epoch, claimed_txs };
                epoch_stats.push_back(stats);
            } else {
                let stats = EpochStats { epoch, claimed_txs: 0 };
                epoch_stats.push_back(stats);
            };
            i = i + 1;
        };
        return Stats {
            paused: director.paused,
            current_epoch: epoch(ctx),
            claimed_total: coin::total_supply(&director.treasury),
            claimed_epoch: epoch_stats,
        }
    }

    /// Get Stats for the Director and the latest epochs, in descending order, and starting
    /// from yesterday's epoch because today's EpochCounter cannot exist (see register()).
    public fun stats_for_recent_epochs(
        director: &Director,
        epoch_count: u64,
        ctx: &TxContext,
    ): Stats {
        let epoch_now = epoch(ctx);
        let mut epoch_numbers = vector<u64>[];
        let mut i = 0;
        while (i < epoch_count && i < epoch_now) {
            i = i + 1;
            epoch_numbers.push_back(epoch_now - i);
        };
        return stats_for_specific_epochs(director, epoch_numbers, ctx)
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
            b"Spam to Earn on Sui", // description
            option::none(),// icon_url TODO
            ctx,
        );

        // Freeze the metadata
        transfer::public_freeze_object(metadata);

        // Create the only Director that will ever exist, and share it
        let director = Director {
            id: object::new(ctx),
            treasury,
            paused: false, // TODO: switch to true before mainnet
            user_counters: table::new(ctx),
            epoch_txs: table::new(ctx),
        };
        transfer::share_object(director);

        // Create the admin capability, and transfer it
        let adminCap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(adminCap, sender(ctx))
    }

    // === Test Functions ===
}
