/*
An example for how to use the SDK to build Node.js CLI tools for SPAM
*/

import { SPAM_IDS } from "@polymedia/spam-sdk";
import { shortenSuiAddress } from "@polymedia/suits";

async function main()
{
    const mainnetPackageId = SPAM_IDS["mainnet"].packageId;
    console.log("mainnetPackageId:", shortenSuiAddress(mainnetPackageId));
}

void main();
