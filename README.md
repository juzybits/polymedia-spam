# SPAM

Spam to Earn on Sui.

<!-- ![Polymedia SPAM](https://spam.polymedia.app/img/open-graph.webp) -->

The SPAM system has two components:

1 - An onchain mechanism to track user transactions, calculate rewards per user, and let users mint SPAM in proportion to the number of txs they sent.<br/>

2 - A web miner for users to easily send lots of transactions automatically, as well as mint and claim SPAM coins.

## ELI5

One billion SPAM coins are minted every day.

Users earn SPAM by sending Sui transactions.

The more txs you send, the more SPAM you receive.

There is no proof of work, only proof of spam.

## Mechanics

A Sui "epoch" is roughly equivalent to 1 day.

Users send txs to increase their tx counters during epoch `N`, register their tx counters during epoch `N+1`, and mint SPAM anytime from epoch `N+2` based on the spamming they did in epoch `N`:

- Epoch 0: user spams UserCounter.0 (UC.0)
- Epoch 1: user spams UC.1, registers UC.0
- Epoch 2: user spams UC.2, registers UC.1, claims UC.0
- Epoch 3: user spams UC.3, registers UC.2, claims UC.1
- And so on

## Implementation

Single-writer `UserCounter` objects are used to track the number of txs sent by each user within one epoch.

When that epoch ends, the user registers their `UserCounter` in a shared object, so that the total number of txs in the previous epoch can be calculated.

After that next epoch (registration period) ends, users can mint SPAM coins in proportion to the number of txs they sent.

## Functions

`new_user_counter()`: user creates a `UserCounter` owned object for the current epoch ("epoch 0")

`increment_user_counter()`: user sends txs to increase `UserCounter.tx_count`, until "epoch 0" ends

`register_user_counter()`: during "epoch 1", user registers their `UserCounter` in an `EpochCounter` shared object, which counts all txs in the epoch

`claim_user_counter()`: from "epoch 2", users can mint SPAM coins in proportion to the number of txs they sent during "epoch 0"
