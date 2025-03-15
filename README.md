# SPAM

"Spam to Earn" a.k.a. "Proof of Spam" on Sui.

![Polymedia SPAM](https://spam.polymedia.app/img/open-graph.webp)

## ELI5

One billion SPAM coins are minted every day.

Users earn SPAM simply by sending Sui transactions.

The more txs you send, the more SPAM you receive.

There is no proof of work, only proof of spam.

## System overview

The SPAM system has two components:

1\) An onchain mechanism to track user transactions, calculate rewards per user, and let users mint SPAM in proportion to the number of txs they sent: [src/sui](./src/sui).

2\) A web miner for users to easily send lots of txs, as well as mint and claim SPAM coins: [src/web](./src/web). The web miner is built on top of the TypeScript SDK: [src/sdk](./src/sdk).

## Mining mechanism

A Sui "epoch" is roughly equivalent to 1 day.

Users send txs to increase their tx counters during epoch `N`, register their tx counters during epoch `N+1`, and mint SPAM anytime from epoch `N+2` based on the spamming they did in epoch `N`:

- Epoch 0: user spams UserCounter.0 (UC.0)
- Epoch 1: user spams UC.1, registers UC.0
- Epoch 2: user spams UC.2, registers UC.1, claims UC.0
- Epoch 3: user spams UC.3, registers UC.2, claims UC.1
- And so on

## Sui implementation

Single-writer `UserCounter` objects are used to track the number of txs sent by each user within one epoch.

When that epoch ends, the user registers their `UserCounter` in a shared `EpochCounter` object, so that the total number of txs in the previous epoch can be calculated.

After that next epoch (registration period) ends, users can mint SPAM coins in proportion to the number of txs they sent.

Key functions in the order they get called for any given `UserCounter`:

1) `new_user_counter`: user creates a `UserCounter` owned object for the current epoch (epoch N)
2) `increment_user_counter`: user sends txs to increase `UserCounter.tx_count`, until epoch N ends
3) `register_user_counter`: during epoch N+1, user registers their `UserCounter` in an `EpochCounter` shared object, which counts all txs in the epoch
4) `claim_user_counter`: from epoch N+2, users can mint SPAM coins in proportion to the number of txs they sent during epoch N
