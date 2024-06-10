#!/usr/bin/env bash

# Call spam::spam::admin_destroy()

PACKAGE=0x30a644c3485ee9b604f52165668895092191fcaf5489a846afa7fc11cdb9b24a
ADMIN_CAP=0x76e92b7f4f6c4267b0c800cc228bdf0abaf76bb1f67f2bdc130768d5a28eb246

sui client call \
 --gas-budget 50000000 \
 --package $PACKAGE \
 --module spam \
 --function admin_destroy \
 --args $ADMIN_CAP
