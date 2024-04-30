#!/usr/bin/env bash

# Call spam::spam::admin_pause() to disable UserCounter registrations

PACKAGE=
DIRECTOR=
ADMIN_CAP=

sui client call \
 --gas-budget 50000000 \
 --package $PACKAGE \
 --module spam \
 --function admin_pause \
 --args $DIRECTOR $ADMIN_CAP
