#!/usr/bin/env bash

# Call 0x2::package::make_immutable() to destroy an UpgradeCap object

set -o nounset      # Treat unset variables as an error when substituting
set -o errexit      # Exit immediately if any command returns a non-zero status
set -o pipefail     # Prevent errors in a pipeline from being masked
# set -o xtrace       # Print each command to the terminal before execution

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <UPGRADE_CAP>"
    exit 1
fi

UPGRADE_CAP="$1"

sui client call \
 --gas-budget 300300300 \
 --package 0x2 \
 --module package \
 --function make_immutable \
 --args "$UPGRADE_CAP"
