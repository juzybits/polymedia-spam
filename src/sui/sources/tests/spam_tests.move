#[test_only]
module spam::spam_tests {

    use sui::test_utils::destroy;

    use spam::test_runner;
    use spam::spam::{Self, UserCounter};
    use spam::assert_user_counter;

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
        .registered(false);

        destroy(assert);

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
        .registered(false);

        destroy(assert);

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
}
