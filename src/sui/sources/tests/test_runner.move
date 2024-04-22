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

 public fun next_tx(self: &mut TestRunner, sender: address): &mut TestRunner {
  self.scenario.next_tx(sender);
  self
 }

 public fun destroy<T>(self: &mut TestRunner, v: T): &mut TestRunner {
  test_utils::destroy(v);
  self
 }

 public fun end(self: TestRunner) {
  test_utils::destroy(self);
 }
}