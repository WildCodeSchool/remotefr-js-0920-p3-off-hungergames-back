#!/bin/bash

# Please adjust these
UNIXUSERPASS=7eBcfJ4Rw3Px
PGPASS=Off_HunGam_2k21
# ROBOTOFF_BASE_URL=https://robotoff.openfoodfacts.org
# Robotoff instance we used for dev & testing
# Will be shut down in Feb. 2021
ROBOTOFF_BASE_URL=https://robotoff.wild31.com
# Public URL of the server, e.g. https://feedme.openfoodfacts.org (no trailing slash)
# PUBLIC_URL=https://feedme.openfoodfacts.org
# Test with a VM
PUBLIC_URL=http://192.168.1.33

export UNIXUSERNAME=nodejs
export UNIXUSERHASH=$(openssl passwd -crypt $UNIXUSERPASS)
export PGUSER=hungergames
export PGPASSWORD=$PGPASS
