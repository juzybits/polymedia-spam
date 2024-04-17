module spam::spam
{
    use std::option;
    use sui::coin;
    use sui::transfer;
    use sui::tx_context::{TxContext, sender};

    struct SPAM has drop {}

    fun init(witness: SPAM, ctx: &mut TxContext)
    {
        // Create the coin
        let (treasury, metadata) = coin::create_currency(
            witness,
            0, // decimals
            b"SPAM", // symbol
            b"SPAM", // name
            b"The original Proof of Spam coin", // description
            option::none(),// icon_url TODO
            ctx,
        );

        // Freeze the metadata
        transfer::public_freeze_object(metadata);

        // TODO lock in shared object
        transfer::public_transfer(treasury, sender(ctx));
    }
}
