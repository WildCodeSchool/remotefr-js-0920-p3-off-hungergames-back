#!/bin/bash

# Just to revert everything on the VM

# Source the environment variables
source ./hg-shell-vars.sh

sudo -u postgres psql -c "DROP DATABASE hungergames;"
sudo -u postgres psql -c "DROP ROLE hungergames;"

# Remove modules
apt-get update
apt-get remove -y sudo curl git openssl postgresql

# Delete user
userdel $UNIXUSERNAME

# Remove nodejs
npm uninstall -g pm2
apt-get remove nodejs

# echo "localhost:5432:hungergames:hungergames:$PGPASSWORD" > ~/.pgpass
