#!/usr/bin/env bash

PACKAGE=
DIRECTOR=
ADMIN_CAP=

sui client call \
 --gas-budget 100100100 \
 --package $PACKAGE \
 --module spam \
 --function admin_resume \
 --args $DIRECTOR $ADMIN_CAP
