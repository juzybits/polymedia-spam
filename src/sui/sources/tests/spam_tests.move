#[test_only]
module spam::spam_tests {

    use spam::test_runner;
    use spam::assert_user_counter;
    use spam::spam::{Self, UserCounter};

    const ALICE: address = @0xa11ce;
    const ADMIN: address = @0x12;

    #[test]
    fun test_new_user_counter() {
        let epoch = 12;

        let mut runner = test_runner::start();

        runner.increment_epoch(epoch);

        spam::new_user_counter_for_testing(runner.ctx());

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

        spam::new_user_counter_for_testing(runner.ctx());

        runner.next_tx();

        let mut user_counter = runner.take_from_sender<UserCounter>();

        let initial_tx_count = user_counter.tx_count();
        let initial_epoch = user_counter.epoch();

        runner.increment_user_counter(&mut user_counter, count);

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

        spam::new_user_counter_for_testing(runner.ctx());

        // We incremented the epoch, which  makes the user_counter invalid.
        runner.increment_epoch(1);
        runner.next_tx();

        let mut user_counter = runner.take_from_sender<UserCounter>();

        runner.increment_user_counter(&mut user_counter, 1);

        user_counter.destroy_user_counter();

        runner.end();
    }

    #[test]
    public fun test_register_user_counter() {
        let mut runner = test_runner::start();

        let admim_tx_count = 15;
        let alice_tx_count = 17;
        let counter_epoch = 0;

        // Create Admin User Counter
        spam::new_user_counter_for_testing(runner.ctx());

        // Increment Txs for Admin
        runner.next_tx_with_sender(ADMIN);
        let mut admin_counter = runner.take_from_sender<UserCounter>();
        runner.increment_user_counter(&mut admin_counter, admim_tx_count);

        // Create Alice User Counter
        runner.next_tx_with_sender(ALICE);
        spam::new_user_counter_for_testing(runner.ctx());

         // Increment Txs for Alice
        runner.next_tx_with_sender(ALICE);
        let mut alice_counter = runner.take_from_sender<UserCounter>();
        runner.increment_user_counter(&mut alice_counter, alice_tx_count);

        runner.increment_epoch(1);

        let mut admin_counter = assert_user_counter::new(admin_counter)
        .epoch(counter_epoch)
        // Creating the counter counts as 1
        .tx_count(admim_tx_count + 1)
        .registered(false)
        .pop();        

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
        .assert_director_tx_count(alice_tx_count + admim_tx_count + 2)
        .assert_spam_total_supply(0)
        .assert_director_epoch_tx_count(counter_epoch, alice_tx_count + admim_tx_count + 2);

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

        spam::new_user_counter_for_testing(runner.ctx());

        runner.next_tx();

        let mut user_counter = runner.take_from_sender<UserCounter>();

        runner.increment_user_counter(&mut user_counter, 1);
        runner.pause_director();

        runner.register_user_counter(&mut user_counter, ADMIN);

        user_counter.destroy_user_counter();

        runner.end();
    }

    #[test]
    #[expected_failure(abort_code = spam::EUserCounterIsRegistered)]
    fun test_register_user_counter_error_counter_is_registered() {
        let mut runner = test_runner::start();

        spam::new_user_counter_for_testing(runner.ctx());

        runner.next_tx();

        let mut user_counter = runner.take_from_sender<UserCounter>();

        runner.increment_user_counter(&mut user_counter, 1);

        runner.increment_epoch(1);

        runner.register_user_counter(&mut user_counter, ADMIN);
        runner.register_user_counter(&mut user_counter, ADMIN);

        user_counter.destroy_user_counter();

        runner.end();
    }    

    #[test]
    #[expected_failure(abort_code = spam::EWrongEpoch)]
    fun test_register_user_counter_error_wrong_epoch() {
        let mut runner = test_runner::start();

        spam::new_user_counter_for_testing(runner.ctx());

        runner.next_tx();

        let mut user_counter = runner.take_from_sender<UserCounter>();

        runner.increment_user_counter(&mut user_counter, 1);

        runner.increment_epoch(2);

        runner.register_user_counter(&mut user_counter, ADMIN);

        user_counter.destroy_user_counter();

        runner.end();
    }   

    #[test]
    #[expected_failure(abort_code = spam::EUserIsRegistered)]
    fun test_register_user_counter_error_user_is_registered() {
        let mut runner = test_runner::start();

        // Makes two counters
        spam::new_user_counter_for_testing(runner.ctx());
        spam::new_user_counter_for_testing(runner.ctx());

        runner.next_tx();

        let mut user_counter = runner.take_from_sender<UserCounter>();
        let mut user_counter2 = runner.take_from_sender<UserCounter>();

        runner.increment_user_counter(&mut user_counter, 1);
        runner.increment_user_counter(&mut user_counter2, 2);

        runner.increment_epoch(1);

        runner.register_user_counter(&mut user_counter, ADMIN);
        runner.register_user_counter(&mut user_counter2, ADMIN);

        user_counter.destroy_user_counter();
        user_counter2.destroy_user_counter();

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