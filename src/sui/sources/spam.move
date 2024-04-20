module spam::spam
{
    // === Imports ===

    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::table::{Self, Table};
    use sui::tx_context::{epoch, sender};

    // === Errors ===

    const EWrongEpoch: u64 = 100;
    const EDirectorIsPaused: u64 = 101;
    const EUserIsRegistered: u64 = 102;
    const EUserCounterIsRegistered: u64 = 104;
    const EUserCounterIsNotRegistered: u64 = 103;

    // === Constants ===

    const TOTAL_EPOCH_REWARD: u64 = 1_000_000_000;

    // === Structs ===

    public struct SPAM has drop {}

    public struct AdminCap has store, key {
        id: UID,
    }

    /// Singleton shared object to coordinate state and to mint coins.
    public struct Director has key, store {
        id: UID,
        paused: bool,
        tx_count: u64,
        treasury: TreasuryCap<SPAM>,
        epoch_counters: Table<u64, EpochCounter>, // keys are epochs
    }

    /// Can only exist inside the Director.epoch_counters table.
    /// Tracks how many tx blocks each user completed in one epoch.
    public struct EpochCounter has store {
        epoch: u64,
        tx_count: u64,
        user_counts: Table<address, u64>,
    }

    /// Non transferable owned object tied to a user address.
    /// Tracks how many tx blocks the user completed in one epoch.
    public struct UserCounter has key {
        id: UID,
        epoch: u64,
        tx_count: u64,
        registered: bool,
    }

    // === User Functions ===

    /// Users can create multiple counters per epoch, but it is pointless
    /// because they can only register() one of them.
    entry fun new_user_counter(
        ctx: &mut TxContext,
    ) {
        let user_counter = UserCounter {
            id: object::new(ctx),
            epoch: epoch(ctx),
            tx_count: 1, // count this transaction
            registered: false,
        };
        transfer::transfer(user_counter, sender(ctx));
    }

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

    public fun destroy_user_counter(
        user_counter: UserCounter,
    ) {
        let UserCounter { id, epoch: _, tx_count: _, registered: _} = user_counter;
        sui::object::delete(id);
    }

    /// Users can only register their counter during the 1st epoch after UserCounter.epoch.
    /// Users can only register one UserCounter per epoch.
    public fun register(
        director: &mut Director,
        user_counter: &mut UserCounter,
        ctx: &mut TxContext,
    ) {
        assert!(director.paused == false, EDirectorIsPaused);
        assert!(user_counter.registered == false, EUserCounterIsRegistered);

        let previous_epoch = epoch(ctx) - 1;
        assert!(user_counter.epoch == previous_epoch, EWrongEpoch);

        let sender_addr = sender(ctx);
        let epoch_counter = get_or_create_epoch_counter(director, previous_epoch, ctx);
        assert!(epoch_counter.user_counts.contains(sender_addr) == false, EUserIsRegistered);

        epoch_counter.user_counts.add(sender_addr, user_counter.tx_count);
        epoch_counter.tx_count = epoch_counter.tx_count + user_counter.tx_count;
        user_counter.registered = true;
    }

    /// Users can only claim their rewards from the 2nd epoch after UserCounter.epoch.
    /// User rewards are proportional to their share of completed txs in the epoch.
    /// Director.paused is not checked here so users can always claim past rewards.
    public fun claim(
        director: &mut Director,
        user_counter: UserCounter,
        ctx: &mut TxContext,
    ): Coin<SPAM> {
        let max_allowed_epoch = epoch(ctx) - 2;
        assert!(user_counter.epoch <= max_allowed_epoch, EWrongEpoch);
        assert!(user_counter.registered == true, EUserCounterIsNotRegistered);

        let epoch_counter = director.epoch_counters.borrow_mut(user_counter.epoch);
        // we can safely remove the user from the EpochCounter because users
        // are no longer allowed to register() a UserCounter for this epoch
        let user_txs = epoch_counter.user_counts.remove(sender(ctx));
        let user_reward = (user_txs * TOTAL_EPOCH_REWARD) / epoch_counter.tx_count;

        destroy_user_counter(user_counter);

        let coin = director.treasury.mint(user_reward, ctx);
        return coin
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

    // === Private helpers ===

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
            epoch_counters: table::new(ctx),
            tx_count: 0,
            paused: false, // TODO: switch to true before mainnet
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
