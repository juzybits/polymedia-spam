#[test_only]
module spam::spam_tests {

    use sui::coin;

    use spam::test_runner;
    use spam::assert_user_counter;
    use spam::spam::{Self, UserCounter};

    const ALICE: address = @0xa11ce;
    const ADMIN: address = @0x12;
    const TOTAL_EPOCH_REWARD: u64 = 10_000_000_000_000; // 1 billion (4 decimals)

    use fun test_runner::assert_value as coin::Coin.assert_value;

    #[test]
    fun test_new_user_counter() {
        let epoch = 12;

        let mut runner = test_runner::start();

        runner.increment_epoch(epoch);

        runner.new_user_counter();

        runner.next_tx();

        let assert = assert_user_counter::new(runner.take_from_sender<UserCounter>());

        assert
        .epoch(epoch)
        .tx_count(1)
        .registered(false)
        .destroy();

        runner.end();
    }

    #[test]
    fun test_increment_user_counter() {
        let count = 15;

        let mut runner = test_runner::start();

        runner.new_user_counter();
        runner.next_tx();

        let user_counter = runner.take_from_sender<UserCounter>();
        let initial_tx_count = user_counter.tx_count();
        let initial_epoch = user_counter.epoch();
        runner.return_to_sender(user_counter);
        runner.next_tx();

        runner.increment_user_counter(count);

        let user_counter = runner.take_from_sender<UserCounter>();
        let assert = assert_user_counter::new(user_counter);

        assert
        .epoch(initial_epoch)
        .tx_count(count + initial_tx_count)
        .registered(false)
        .destroy();

        runner.end();
    }

    #[test]
    #[expected_failure(abort_code = spam::EWrongEpoch)]
    fun test_increment_user_counter_error_wrong_epoch() {
        let mut runner = test_runner::start();

        runner.new_user_counter();

        // We incremented the epoch, which  makes the user_counter invalid.
        runner.increment_epoch(1);
        runner.next_tx();

        runner.increment_user_counter(1);

        runner.end();
    }

    #[test]
    public fun test_register_user_counter() {
        let mut runner = test_runner::start();

        let admin_tx_count = 15;
        let alice_tx_count = 17;
        let counter_epoch = 0;

        // Create Admin User Counter
        runner.next_tx_with_sender(ADMIN);
        runner.new_user_counter();
        // Increment Txs for Admin
        runner.next_tx_with_sender(ADMIN);
        runner.increment_user_counter(admin_tx_count);

        // Create Alice User Counter
        runner.next_tx_with_sender(ALICE);
        runner.new_user_counter();
         // Increment Txs for Alice
        runner.next_tx_with_sender(ALICE);
        runner.increment_user_counter(alice_tx_count);

        runner.increment_epoch(1);

        runner.next_tx_with_sender(ADMIN);
        let admin_counter = runner.take_from_sender<UserCounter>();
        let mut admin_counter = assert_user_counter::new(admin_counter)
        .epoch(counter_epoch)
        // Creating the counter counts as 1
        .tx_count(admin_tx_count + 1)
        .registered(false)
        .pop();

        runner.next_tx_with_sender(ALICE);
        let alice_counter = runner.take_from_sender<UserCounter>();
        let mut alice_counter = assert_user_counter::new(alice_counter)
        .epoch(counter_epoch)
        // Creating the counter counts as 1
        .tx_count(alice_tx_count + 1)
        .registered(false)
        .pop();

        runner
        .assert_director_paused(false)
        .assert_director_tx_count(0)
        .assert_spam_total_supply(0)
        .assert_director_epoch_tx_count(counter_epoch, 0);

        runner.register_user_counter(&mut admin_counter, ADMIN);
        runner.register_user_counter(&mut alice_counter, ALICE);

        runner
        .assert_director_paused(false)
        .assert_director_tx_count(alice_tx_count + admin_tx_count + 2)
        .assert_spam_total_supply(0)
        .assert_director_epoch_tx_count(counter_epoch, alice_tx_count + admin_tx_count + 2);

        assert_user_counter::new(admin_counter)
        .registered(true)
        .destroy();

        assert_user_counter::new(alice_counter)
        .registered(true)
        .destroy();

        runner.end();
    }

    #[test]
    #[expected_failure(abort_code = spam::EDirectorIsPaused)]
    fun test_register_user_counter_error_director_is_paused() {
        let mut runner = test_runner::start();

        runner.new_user_counter();
        runner.next_tx();

        runner.increment_user_counter(1);
        runner.pause_director();

        let mut user_counter = runner.take_from_sender<UserCounter>();
        runner.register_user_counter(&mut user_counter, ADMIN);
        user_counter.destroy_user_counter();

        runner.end();
    }

    #[test]
    #[expected_failure(abort_code = spam::EUserCounterIsRegistered)]
    fun test_register_user_counter_error_counter_is_registered() {
        let mut runner = test_runner::start();

        runner.new_user_counter();
        runner.next_tx();

        runner.increment_user_counter(1);

        runner.increment_epoch(1);

        let mut user_counter = runner.take_from_sender<UserCounter>();
        runner.register_user_counter(&mut user_counter, ADMIN);
        runner.register_user_counter(&mut user_counter, ADMIN);

        user_counter.destroy_user_counter();

        runner.end();
    }

    #[test]
    #[expected_failure(abort_code = spam::EWrongEpoch)]
    fun test_register_user_counter_error_wrong_epoch() {
        let mut runner = test_runner::start();

        runner.new_user_counter();
        runner.next_tx();

        runner.increment_user_counter(1);

        runner.increment_epoch(2);

        let mut user_counter = runner.take_from_sender<UserCounter>();
        runner.register_user_counter(&mut user_counter, ADMIN);
        user_counter.destroy_user_counter();

        runner.end();
    }

    #[test]
    #[expected_failure(abort_code = spam::EUserIsRegistered)]
    fun test_register_user_counter_error_user_is_registered() {
        let mut runner = test_runner::start();

        // Makes two counters
        runner.new_user_counter();
        runner.new_user_counter();

        runner.next_tx();

        let mut user_counter = runner.take_from_sender<UserCounter>();
        let mut user_counter2 = runner.take_from_sender<UserCounter>();

        runner.increment_epoch(1);

        runner.register_user_counter(&mut user_counter, ADMIN);
        runner.register_user_counter(&mut user_counter2, ADMIN);

        user_counter.destroy_user_counter();
        user_counter2.destroy_user_counter();

        runner.end();
    }

    #[test]
    public fun test_claim_user_counter() {
        let mut runner = test_runner::start();

        let admin_tx_count = 10;
        let alice_tx_count = 20;
        let total_tx_count = admin_tx_count + alice_tx_count + 2;

        // Create Admin User Counter
        runner.new_user_counter();

        // Increment Txs for Admin
        runner.next_tx_with_sender(ADMIN);
        runner.increment_user_counter(admin_tx_count);

        // Create Alice User Counter
        runner.next_tx_with_sender(ALICE);
        runner.new_user_counter();

         // Increment Txs for Alice
        runner.next_tx_with_sender(ALICE);
        runner.increment_user_counter(alice_tx_count);

        runner.increment_epoch(1);

        runner
        .assert_spam_total_supply(0);

        runner.next_tx_with_sender(ADMIN);
        let mut admin_counter = runner.take_from_sender<UserCounter>();
        runner.register_user_counter(&mut admin_counter, ADMIN);

        runner.next_tx_with_sender(ALICE);
        let mut alice_counter = runner.take_from_sender<UserCounter>();
        runner.register_user_counter(&mut alice_counter, ALICE);

        runner.increment_epoch(1);

        let admin_spam = runner.claim_user_counter(admin_counter, ADMIN);
        let alice_spam = runner.claim_user_counter(alice_counter, ALICE);

        admin_spam.assert_value((TOTAL_EPOCH_REWARD * (admin_tx_count + 1)) / total_tx_count);
        alice_spam.assert_value((TOTAL_EPOCH_REWARD * (alice_tx_count + 1)) / total_tx_count);

        runner.assert_spam_total_supply(TOTAL_EPOCH_REWARD);

        runner.end();
    }

    #[test]
    #[expected_failure(abort_code = spam::EWrongEpoch)]
    public fun test_claim_user_counter_error_wrong_epoch() {
        let mut runner = test_runner::start();

        runner.increment_epoch(2);

        // Create and increment Admin User Counter
        runner.new_user_counter();
        runner.next_tx_with_sender(ADMIN);
        let mut admin_counter = runner.take_from_sender<UserCounter>();

        runner.increment_epoch(1);

        runner.register_user_counter(&mut admin_counter, ADMIN);

        let admin_spam = runner.claim_user_counter(admin_counter, ADMIN);

        admin_spam.assert_value(0);

        runner.end();
    }

    #[test]
    #[expected_failure(abort_code = spam::EUserCounterIsNotRegistered)]
    public fun test_claim_user_counter_error_user_counter_is_not_registered() {
        let mut runner = test_runner::start();

        // Create and increment Admin User Counter
        runner.new_user_counter();
        runner.next_tx_with_sender(ADMIN);
        let admin_counter = runner.take_from_sender<UserCounter>();

        runner.increment_epoch(2);

        let admin_spam = runner.claim_user_counter(admin_counter, ADMIN);

        admin_spam.assert_value(0);

        runner.end();
    }

    #[test]
    fun test_admin_functions() {
        let mut runner = test_runner::start();

        // default
        runner
        .assert_director_paused(false);

        runner
        .pause_director()
        .assert_director_paused(true);

        runner
        .resume_director()
        .assert_director_paused(false);

        runner.end();
    }
}
