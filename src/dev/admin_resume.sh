#!/usr/bin/env bash

# Call spam::spam::admin_resume() to enable UserCounter registrations

PACKAGE=
DIRECTOR=
ADMIN_CAP=

sui client call \
 --gas-budget 50000000 \
 --package $PACKAGE \
 --module spam \
 --function admin_resume \
 --args $DIRECTOR $ADMIN_CAP
