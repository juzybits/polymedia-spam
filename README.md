# SPAM

Spam to Earn on Sui.

<!-- ![Polymedia SPAM](https://spam.polymedia.app/img/open-graph.webp) -->

## ELI5

- One billion SPAM coins are minted every day.
- Users can earn SPAM by sending transactions.
- The more transactions a user sends, the more SPAM they receive.
- There is no proof of work.

## How it works

Single-writer `UserCounter` objects are used to track the number of txs sent by each user within one epoch. When that epoch ends, the user registers their `UserCounter` in a shared object, so that the total number of txs in the previous epoch can be calculated. And after that next epoch (registration period) ends, users can mint SPAM coins in proportion to the number of txns they sent.

#### Timeline:

Users spam txs during epoch `N`, register their counters during epoch `N+1`, and mint SPAM anytime from epoch `N+2` based on the spamming they did in epoch `N`:

- epoch 0) user spams UserCounter.0
- epoch 1) user spams UserCounter.1, registers UserCounter.0
- epoch 2) user spams UserCounter.2, registers UserCounter.1, claims UserCounter.0
- epoch 3) user spams UserCounter.3, registers UserCounter.2, claims UserCounter.1
- and so on

#### Functions:
1) `new_user_counter()`: user creates a `UserCounter` owned object for the current epoch ("epoch 0")
2) `increment_user_counter()`: user sends txs to increase `UserCounter.tx_count`, until "epoch 0" ends
3) `register()`: during "epoch 1", user registers their `UserCounter` in a `EpochCounter` shared object, which counts all txs in the epoch
4) `claim()`: from "epoch 2", users can mint SPAM coins in proportion to the number of txns they sent during "epoch 0"
