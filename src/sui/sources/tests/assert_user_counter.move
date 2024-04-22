#[test_only]
module spam::assert_user_counter {
 
 use sui::test_utils::assert_eq;

 use spam::spam::UserCounter;

 public struct State {
  inner: UserCounter
 }

 public fun new(inner: UserCounter): State {
  State {
   inner
  }
 }

 public fun epoch(self: &State, value: u64): &State {
  assert_eq(self.inner.epoch(), value);
  self
 }

 public fun tx_count(self: &State, value: u64): &State {
  assert_eq(self.inner.tx_count(), value);
  self
 }

 public fun registered(self: &State, value: bool): &State {
  assert_eq(self.inner.registered(), value);
  self
 } 
}