#!/bin/bash

# Install modules we'll need
apt-get update
apt-get install -y sudo curl git openssl postgresql nginx

# Source the environment variables
source ./hg-shell-vars.sh

# Create non-privileged account
export PATH=/sbin:$PATH
useradd -d /home/$UNIXUSERNAME -m -p $UNIXUSERHASH -s /bin/bash $UNIXUSERNAME
chown $UNIXUSERNAME:$UNIXUSERNAME hg-env-*
mv hg-env-* /home/$UNIXUSERNAME

# Install Node.js from Nodesource official packages
curl -sL https://deb.nodesource.com/setup_14.x | bash -
apt-get install -y nodejs
npm i -g pm2

# Create hungergames DB owned by hungergames
sudo -u postgres psql -c "CREATE ROLE hungergames WITH PASSWORD '$PGPASSWORD';"
sudo -u postgres psql -c "ALTER ROLE hungergames WITH LOGIN;"
sudo -u postgres psql -c "CREATE DATABASE hungergames OWNER hungergames;"

# Will work with default pg_hba.conf
sed -i '/^local.*all.*all/ilocal\tall\thungergames\t\t\t\t\tpassword' /etc/postgresql/11/main/pg_hba.conf
systemctl restart postgresql

tee installapps.sh <<EOF
#!/bin/bash
cd /home/$UNIXUSERNAME
git clone https://github.com/WildCodeSchool/remotefr-js-0920-p3-off-hungergames-front.git hungergames-front
git clone https://github.com/WildCodeSchool/remotefr-js-0920-p3-off-hungergames-back.git hungergames-back
cd hungergames-front
mv ../hg-env-front .env.local
sed -i -e "s/{PUBLIC_URL}/$PUBLIC_URL/g" .env
npm install
npm run build
cd ../hungergames-back

# TEMP
git checkout debian-deployment

npm install
mv ../hg-env-back .env
sed -i -e "s/{ROBOTOFF_BASE_URL}/$ROBOTOFF_BASE_URL/g" .env
sed -i -e "s/{PGPASSWORD}/$PGPASSWORD/g" .env
echo "localhost:5432:hungergames:hungergames:$PGPASSWORD" > /home/$UNIXUSERNAME/.pgpass
chmod 600 /home/$UNIXUSERNAME/.pgpass
psql -U hungergames -d hungergames < /home/$UNIXUSERNAME/hungergames-back/database/schema.sql
rm /home/$UNIXUSERNAME/.pgpass
pm2 start ecosystem.config.js --env production
EOF

chown $UNIXUSERNAME:$UNIXUSERNAME installapps.sh
chmod +x installapps.sh
mv installapps.sh /home/$UNIXUSERNAME/
sudo -u $UNIXUSERNAME /home/$UNIXUSERNAME/installapps.sh
rm installapps.sh

# Serve with Nginx
cp hungergames-vhost.conf /etc/nginx/sites-available/hungergames
ln -s /etc/nginx/sites-available/hungergames /etc/nginx/sites-enabled/hungergames
rm /etc/nginx/sites-enabled/default
systemctl reload nginx