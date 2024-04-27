#!/usr/bin/env bash

set -o nounset      # Treat unset variables as an error when substituting
set -o errexit      # Exit immediately if any command returns a non-zero status
set -o pipefail     # Prevent errors in a pipeline from being masked
set -o xtrace       # Print each command to the terminal before execution

script_dir=$(cd "$(dirname "$0")" && pwd)
sui_path="$script_dir/../../src/sui";

cd "$sui_path"

sed -i '' 's/SPAM/LOL/g' Move.toml
sed -i '' 's/Spam/Lol/g' Move.toml
sed -i '' 's/spam/lol/g' Move.toml

find sources/ -type f -exec sed -i '' 's/SPAM/LOL/g' {} +
find sources/ -type f -exec sed -i '' 's/Spam/Lol/g' {} +
find sources/ -type f -exec sed -i '' 's/spam/lol/g' {} +
