#[test_only]
module spam::test_runner {

    use sui::test_utils;
    use sui::coin::{CoinMetadata};
    use sui::test_scenario::{Self, Scenario};

    use spam::spam::{Self, SPAM, Director};

    const ADMIN: address = @0xa11ce;

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