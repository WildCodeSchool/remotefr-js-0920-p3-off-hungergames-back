#!/bin/bash

# --- PLEASE adjust the params in this section -----------------------

# Unprivileged Unix account's plain-text password
# MAXIMUM 8 characters
UNIXUSERPASS=

# Unprivileged PostgreSQL role's plain-text password
# USE ANY character BUT / (will break sed regex below)
PGPASS=

# Robotoff instance URL
# (the 2nd one, used for dev, will be shut down in Feb. 21)
# ROBOTOFF_BASE_URL=https://robotoff.openfoodfacts.org
ROBOTOFF_BASE_URL=https://robotoff.wild31.com

# Public URL of the app (no trailing slash!)
# (the 2nd one is for tests with a VM on a LAN)
# PUBLIC_URL=https://feedme.openfoodfacts.org
PUBLIC_URL=http://192.168.1.33

# GitHub front&back repos
GITHUB_REPO_FRONT=https://github.com/WildCodeSchool/remotefr-js-0920-p3-off-hungergames-front.git
GITHUB_REPO_BACK=https://github.com/WildCodeSchool/remotefr-js-0920-p3-off-hungergames-back.git

# --- END of params section ------------------------------------------

# Utility functions
normal='\e[0m'
red='\e[31m'
green="\e[32m"
yellow='\e[33m'
cyan="\e[36m"

exit_error() {
  echo -e "[${red}FATAL${normal}] $1"
  exit 1
}

echo_success() {
  echo -e "[${green}SUCCESS${normal}] $1"
}

check_command() {
  which $1 &>/dev/null
  if [ $? -eq 0 ]; then
    echo -e "[${cyan}OK${normal}] $1"
    return 0
  else
    echo -e "[${yellow}FAIL${normal}] $1"
    return 1
  fi
}

check_commands() {
  for cmd in $1
  do
    check_command "$cmd"
    [ $? -ne 0 ] && exit_error "$cmd not found"
  done
}

# Check required variables (passwords)
check_variables() {
   [ -z "$UNIXUSERPASS" ] && exit_error "UNIXUSERPASS var not set (nodejs Unix account)"
   [ -z "$PGPASS" ] && exit_error "PGPASS var not set (psql role)"
  echo_success "01/07 UNIXUSERPASS and PGPASS variables are set"
}

# Set variables used during the script
set_variables() {
  # Unix account username/pass/home
  UNIXUSERNAME=nodejs
  UNIXUSERHASH=$(openssl passwd -crypt $UNIXUSERPASS)
  UNIXUSERHOME=/home/$UNIXUSERNAME
  # Pg account username/pass
  PGUSER=feedme
  PGPASSWORD=$PGPASS
  # In case useradd isn't found (e.g. running su instead of su -)
  PATH=/sbin:$PATH
  check_commands useradd
  echo_success "02/07 Variables are set and useradd was found"
}


# Install modules we'll need
install_base_packages() {
  apt-get update >> install.log
  apt-get install -y sudo curl git openssl postgresql nginx >> install.log
  check_commands "sudo curl git openssl psql nginx"
  echo_success "03/07 Base packages installed"
}


# Create non-privileged account
create_regular_user() {
  useradd -d $UNIXUSERHOME -m -p $UNIXUSERHASH -s /bin/bash $UNIXUSERNAME
  if [ -d $UNIXUSERHOME ]; then
    echo_success "04/07 Unix account $UNIXUSERNAME created"
  else
    exit_error "Unix account $UNIXUSERNAME not created"
  fi
}


# Install Node.js from Nodesource official packages
install_nodejs() {
  curl -sL https://deb.nodesource.com/setup_14.x | bash -
  apt-get install -y nodejs >> install.log
  check_commands "nodejs npm"
  npm i -g pm2
  check_commands pm2
  echo_success "05/07 Node.js, npm and pm2 installed"
}


# Setup PostgreSQL
setup_pg() {
  # Start/restart pg
  systemctl restart postgresql
  [ $? -ne 0 ] && exit_error "PostgreSQL server not running"

  # Create feedme DB owned by feedme
  sudo -u postgres psql -c "CREATE ROLE $PGUSER WITH PASSWORD '$PGPASSWORD';"
  sudo -u postgres psql -c "ALTER ROLE $PGUSER WITH LOGIN;"
  sudo -u postgres psql -c "CREATE DATABASE feedme OWNER $PGUSER;"

  sudo -u postgres psql -c "\c feedme" || exit_error "PostgreSQL database feedme not created"

  # Will work with default pg_hba.conf
  sed -i "/^local.*all.*all/ilocal\tall\t$PGUSER\t\t\t\t\tpassword" /etc/postgresql/11/main/pg_hba.conf

  # Restart pg
  systemctl restart postgresql
  [ $? -ne 0 ] && exit_error "PostgreSQL server restarted after config change"
  echo_success "06/07 PostgreSQL server running"
}


# Write front-end app env file (will be renamed later)
write_front_env_file() {
  tee feedme-env-front <<EOF
VUE_APP_BACK_API_NODE={PUBLIC_URL}/robotoff
VUE_APP_WEBSITE_URL={PUBLIC_URL}
EOF
  chown $UNIXUSERNAME:$UNIXUSERNAME feedme-env-front
  mv feedme-env-front $UNIXUSERHOME
}


# Write back-end app env file (will be renamed later)
write_back_env_file() {
  tee feedme-env-back <<EOF
PORT=5000
ALLOWED_ORIGINS={PUBLIC_URL}
ROBOTOFF_API_URL={ROBOTOFF_BASE_URL}/api/v1
OFF_API_URL=https://world.openfoodfacts.org/api/v0
OFF_IMAGE_URL=https://static.openfoodfacts.org/images/products
DB_HOST=localhost
DB_USER=feedme
DB_PASSWORD={PGPASSWORD}
DB_DATABASE=feedme
EOF
  chown $UNIXUSERNAME:$UNIXUSERNAME feedme-env-back
  mv feedme-env-back $UNIXUSERHOME
}


# Create apps clone/setup/run script, to be run
# as non-privileged user
write_apps_install_script() {
  tee installapps.sh <<EOF
#!/bin/bash
cd $UNIXUSERHOME
git clone $GITHUB_REPO_FRONT feedme-front >> $UNIXUSERHOME/install.log
[ -d feedme-front ] || (echo "Failed to clone frontend repo" && exit 1)
git clone $GITHUB_REPO_BACK feedme-back >> $UNIXUSERHOME/install.log
[ -d feedme-back ] || (echo "Failed to clone backend repo" && exit 1)

cd feedme-front
mv ../feedme-env-front .env.local
sed -i -e "s,{PUBLIC_URL},$PUBLIC_URL,g" .env.local
npm install >> $UNIXUSERHOME/install.log
[ -d node_modules ] || (echo "Failed to install front-end deps" && exit 1)
npm run build >> $UNIXUSERHOME/install.log
[ -d dist ] || (echo "Failed to build front-end app" && exit 1)

cd ../feedme-back

npm install
[ -d node_modules ] || (echo "Failed to install back-end deps" && exit 1)
mv ../feedme-env-back .env
sed -i -e "s,{PUBLIC_URL},$PUBLIC_URL,g" .env
sed -i -e "s,{ROBOTOFF_BASE_URL},$ROBOTOFF_BASE_URL,g" .env
sed -i -e "s/{PGPASSWORD}/$PGPASSWORD/g" .env
echo "localhost:5432:feedme:feedme:$PGPASSWORD" > $UNIXUSERHOME/.pgpass
chmod 600 $UNIXUSERHOME/.pgpass
psql -U feedme -d feedme < $UNIXUSERHOME/feedme-back/database/schema.sql
rm $UNIXUSERHOME/.pgpass
# Start backend in production mode
pm2 start ecosystem.config.js --env production
# Generate startup script
pm2 startup | tee | tail -n 1 > $UNIXUSERHOME/feedme-startup.sh
# Dump running services so they are restored by startup script
pm2 save
pm2 status 0 || (echo "Failed to start back-end app" && exit 1)
EOF
  chown $UNIXUSERNAME:$UNIXUSERNAME installapps.sh
  chmod +x installapps.sh
  mv installapps.sh $UNIXUSERHOME/
}


# Run install script as non-privileged user
run_apps_install_script() {
  sudo -u $UNIXUSERNAME $UNIXUSERHOME/installapps.sh
  [ $? -ne 0 ] && exit_error "Error while setting up front-end or back-end app"
  echo_success "07/07 Front-end app built & back-end app running"
  rm $UNIXUSERHOME/installapps.sh

  # Run the startup script generated by pm2 (needs sudo) & rm it
  bash $UNIXUSERHOME/feedme-startup.sh
  rm $UNIXUSERHOME/feedme-startup.sh
}


# Write nginx vhost file (will be moved later)
write_nginx_vhost_file() {
  tee feedme-nginx-vhost.conf <<'EOF'
# Feed Me nginx configuration (adapted from default)
server {
	listen 80 default_server;
	listen [::]:80 default_server;

	root /home/nodejs/feedme-front/dist;
	index index.html;

	server_name _;

	# Serve front-end (Vue.js app)
	location / {
		# fall back to index.html (no 404, ever)
		try_files $uri $uri/ /index.html;
	}

	# Serve back-end (Express.js API)
	location /robotoff {
		proxy_pass http://127.0.0.1:5000/robotoff;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}

	# For Let's Encrypt certbot / acme.sh, if you need to set it up later
	location ^~ /.well-known/acme-challenge/ {
		alias /var/www/letsencrypt/.well-known/acme-challenge/;
	}
}

EOF
}


# Serve with Nginx
# All requests to /robotoff/* will be proxied to the Node backend
# All the rest are static assets, with /home/nodejs/feedme-front/dist as webroot
setup_nginx() {
  write_nginx_vhost_file
  cp feedme-nginx-vhost.conf /etc/nginx/sites-available/feedme
  ln -s /etc/nginx/sites-available/feedme /etc/nginx/sites-enabled/feedme
  rm /etc/nginx/sites-enabled/default
  systemctl reload nginx
}

# Check status by running pm2 status
# and requesting front-end & back-end URLs
status_check() {
  echo -e "\n\nAlmost done! Checking status..."
  echo "pm2 status should show off-feedme-api app with green status (online)"
  sudo -u nodejs pm2 status

  echo -e "\n\nRequesting front-end app's URL..."
  echo "should show a line containing <script> and <noscript> tags"
  curl http://localhost | tail -n 1
  if [ $? -ne 0 ]; then
    exit_error "Error requesting front-end app URL"
  else
    echo_success "Check that the curl output contains <script> and <noscript> tags from the Vue.js index.html"
  fi

  echo -e "\n\nRequesting back-end app's root URL..."
  echo "should show the message: Robotoff !"
  curl http://localhost/robotoff && echo
  if [ $? -ne 0 ]; then
    exit_error "Error requesting back-end app URL"
  else
    echo_success "Check that the curl output contains: Robotoff !"
  fi

  echo "Done!"
}

# Run all functions
echo "Installing (details will be logged to install.log)"
check_variables
set_variables
install_base_packages
create_regular_user
install_nodejs
setup_pg
write_front_env_file
write_back_env_file
write_apps_install_script
run_apps_install_script
setup_nginx
status_check
