#[test_only]
module spam::test_runner {

    use sui::coin::{CoinMetadata};
    use sui::test_utils::{Self, assert_eq};
    use sui::test_scenario::{Self, Scenario};

    use spam::spam::{Self, SPAM, UserCounter, Director};

    const ADMIN: address = @0x12;

    public struct TestRunner {
        scenario: Scenario,
        director: Director,
        metadata: CoinMetadata<SPAM>
    }

    public fun start(): TestRunner {
        let mut scenario = test_scenario::begin(ADMIN);

        let scenario_mut = &mut scenario;

        spam::init_for_testing(scenario_mut.ctx());

        scenario_mut.next_tx(ADMIN);

        let director = scenario_mut.take_shared<Director>();
        let metadata = scenario_mut.take_immutable<CoinMetadata<SPAM>>();

        TestRunner {
            scenario,
            director,
            metadata
        }
    }

    public fun increment_user_counter(self: &mut TestRunner, user_counter: &mut UserCounter, count: u64) {
        let mut index = 0;

        while (count > index) {
            spam::increment_user_counter_for_testing(user_counter, self.scenario.ctx());
            index = index + 1;
        };
    }

    public fun increment_epoch(self: &mut TestRunner, value: u64): &mut TestRunner {
        let current_epoch = self.scenario.ctx().epoch();

        let mut index = current_epoch;
        let new_epoch = value + current_epoch;
  
        while (new_epoch > index) {
            self.scenario.ctx().increment_epoch_number();
            index = index + 1;
        };

        self
    }

    public fun take_from_account<T: key>(self: &mut TestRunner, account: address): T {
        self.scenario.take_from_address(account)
    }

    public fun take_from_sender<T: key>(self: &mut TestRunner): T {
        self.scenario.take_from_sender()
    }

    public fun next_tx_with_sender(self: &mut TestRunner, sender: address): &mut TestRunner {
        self.scenario.next_tx(sender);
        self
    }

    public fun register_user_counter(self: &mut TestRunner, user_counter: &mut UserCounter, sender: address): &mut TestRunner {
        spam::register_user_counter(&mut self.director, user_counter, self.scenario.ctx());
        next_tx_with_sender(self, sender)
    }

    public fun assert_director_paused(self: &TestRunner, value: bool): &TestRunner {
        assert_eq(self.director.paused(), value);
        self
    }

    public fun assert_director_tx_count(self: &TestRunner, value: u64): &TestRunner {
        assert_eq(self.director.director_tx_count(), value);
        self
    }

    public fun assert_spam_total_supply(self: &TestRunner, value: u64): &TestRunner {
        assert_eq(self.director.spam_total_supply(), value);
        self
    } 

    public fun assert_director_epoch_tx_count(self: &TestRunner, epoch: u64, value: u64): &TestRunner {
        assert_eq(self.director.epoch_tx_count(epoch), value);
        self
    } 

    public fun assert_director_epoch_user_tx_counts(self: &TestRunner, epoch: u64, user: address, value: u64): &TestRunner {
        assert_eq(self.director.epoch_user_counts(epoch, user), value);
        self
    }  

    public fun next_tx(self: &mut TestRunner): &mut TestRunner {
        self.scenario.next_tx(ADMIN);
        self
    }

    public fun ctx(self: &mut TestRunner): &mut TxContext {
        self.scenario.ctx()
    }

    public fun destroy<T>(self: &mut TestRunner, v: T): &mut TestRunner {
        test_utils::destroy(v);
        self
    }

    public fun end(self: TestRunner) {
        test_utils::destroy(self);
    }
}