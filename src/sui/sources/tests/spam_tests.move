#[test_only]
module spam::spam_tests {

 use sui::test_utils::destroy;

 use spam::spam;
 use spam::test_runner;
 use spam::assert_user_counter;


 #[test]
 fun test_new_user_counter() {
  let epoch = 123;
  let mut ctx = tx_context::new(@0x0, x"3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532", epoch, 0, 0);
  let user_counter = spam::new_user_counter_for_testing(&mut ctx);

  let assert = assert_user_counter::new(user_counter);

  assert
  .epoch(epoch)
  .tx_count(1)
  .registered(false);

  destroy(assert);
 }
}