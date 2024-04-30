#!/usr/bin/env bash

# Call spam::spam::admin_resume() to enable UserCounter registrations

# mainnet LOL
PACKAGE=0xb677216bb9992c1576c1bd009fbce2e6dc58f004b92d2650156ebb88e43a08e3
DIRECTOR=0x6ae73b50ffe305118883a1259134ebb574a2793958cb2c1bec33b7db03a5017e
ADMIN_CAP=0xd7ecdf61c7e31020882d632a0ffd9fe54f1f3ca2269ec432798f4f8dc5a8defe

sui client call \
 --gas-budget 50000000 \
 --package $PACKAGE \
 --module spam \
 --function admin_resume \
 --args $DIRECTOR $ADMIN_CAP
