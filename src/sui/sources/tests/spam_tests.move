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
}