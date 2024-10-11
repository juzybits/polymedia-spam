module spam_art::spam_diptych;

// === imports ===

use std::string::{utf8, String};
use sui::display::{Self};
use sui::package::{Self};

// === structs ===

public struct SPAM_DIPTYCH has drop {}

public struct SpamDiptych has key, store {
    id: UID,
    name: String,
    description: String,
    author: String,
}

// === initialization ===

fun init(otw: SPAM_DIPTYCH, ctx: &mut TxContext)
{
    // claim Publisher object

    let publisher = package::claim(otw, ctx);

    // 1 of 1 SpamDiptych

    let art = SpamDiptych {
        id: object::new(ctx),
        name: utf8(b"SPAM Diptych"),
        description: utf8(b"\"SPAM Diptych\" (2024) by @juzybits features a playful 2x2 grid of the iconic \"SPAM face\". Each face is identical in form but shifts in color palette, with a dynamic system governing the alternation of colors. The background color of each face determines the eye color of the next face clockwise and the veins color of the next face counter-clockwise. The lip color is taken from the background of the face diagonally across. Through this structure, the artwork comments on the viral nature of online imagery, where variations of the same meme spread endlessly, taking on new forms and meanings."),
        author: utf8(b"@juzybits"),
    };

    // Display<SpamDiptych>

    let mut display = display::new<SpamDiptych>(&publisher, ctx);
    display.add(utf8(b"name"), utf8(b"{name}"));
    display.add(utf8(b"description"), utf8(b"{description}"));
    display.add(utf8(b"author"), utf8(b"{author}"));
    let mut img = b"data:image/png;base64,";
    img.append(b"");
    display.add(utf8(b"image_url"), utf8(img));
    display::update_version(&mut display);

    // transfer objects to the sender

    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display, ctx.sender());
    transfer::public_transfer(art, ctx.sender());
}
