# Open Food Facts - Feed Me! (backend/API)

## TODO

* See if we should merge back & front repos into a single one (easier to manage with Docker Compose)

## Deploying on a production server

You have three options:

1. The easy way (without Docker), using the provided install script
2. The hard way (without Docker), manually setting up everything
3. Another easy way, with Docker Compose.

> Note: the option 2 is a break-down of the script used in option 1. There's only a slight difference, regarding the order of the steps, and how PM2 (Node.js process manager) is installed.

Before we get into that, let's talk about the initial server setup.

### Initial server setup

Whichever option you choose, the starting point is a Debian Buster server. We won't get into much detail about the server's initial setup. *However*, if you are to deploy the app on your own VPS, there are a few initial steps that you definitely *should* perform:

* Updating your system
* Creating a non-root account with sudo privileges (if you wan't to perform administrative tasks without using `su` every time)
* Creating SSH keys for the non-root user, and putting the public keys under the `.ssh` folder of each user
* Disabling SSH access without password
* Disabling SSH for `root`
* Setting up the firewall

Here are a few pointers that you might find useful:

* [Initial Server Setup with Debian 10](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-debian-10) Covers the creation of a non-root account (with sudo), and basic firewall setup
* [The Debian Administrator's Handbook](https://debian-handbook.info/browse/stable/), and its [chapter on security](https://debian-handbook.info/browse/stable/security.html) If you want more insights on hardening your server
* [Correct file permissions for ssh keys and config](https://gist.github.com/grenade/6318301)

With that out of the way, choose one of the following options.

### Option 1: using the install script

You can use our [install script](scripts/install.sh) to set up the backend *and* the frontend apps at once, on a Debian Buster server.

1. SSH to your server
2. Become root : `su -`
3. Install curl and vim (or your favorite text editor): `apt-get install -y curl vim`
4. Download the install script: `curl -L -o install.sh http://bit.do/off-feedme-tempinstall` (**TODO** replace with definitive URL)
5. Edit params in the header section of `install.sh`, especially `UNIXUSERPASS` and `PGPASS`.
6. Run the script: `bash install.sh`

### Option 2: setting up the server manually

This section is basically a break-down of all the steps that are performed by the install script.

We'll skip the two first steps of the install script (`check_variables` and `set_variables`), which only make sense for automated setup. We'll describe the required variables as we go.

Before getting into it, let's have a brief overview of what we'll be doing:

* Install essential system packages, such as Git (which we'll use to get the code from GitHub).
* Create a non-privileged user, which will run FeedMe's backend app.
* Install PostgreSQL, which is the database engine on which FeedMe's backend relies.
* Install Node.js, which will serve two purposes:

    * Running FeedMe's backend application, based on the Node.js framework [Express](https://expressjs.com).
    * Building FeedMe's frontend application, based on [Vue](https://vuejs.org). It uses NPM for tooling (Webpack, Babel, etc), both for development and production.
* Install PM2, a process manager for Node.js
* Install and configure the backend and frontend applications
* Install and configure Nginx, which will serve both the backend and frontend applications.

Now, the firsts steps are to be performed from the account that has sudo privileges.

#### Install base packages

First update the packages list:

```
sudo apt-get update
```

Then install OpenSSL, Curl, Vim, Git and Etckeeper (Track changes on `/etc` with Git):

```
sudo apt-get install -y curl vim git openssl etckeeper
```

#### Create a regular user

It's probably best to run the Node.js process as an unprivileged user. Which is why we'll create a `nodejs` user who won't have sudo. Before actually creating this account, generate a secure password and keep it in your password manager.

Then run this command, and paste that password when asked to:

```
sudo adduser nodejs
```

#### Install and setup PostgreSQL

Install Postgres:

```
sudo apt-get install -y postgresql
```

Then it is advised to create a Postgres role that will only have access to the app's database.

In order to do that, and to create the database, get into the Postgres shell, as role `postgres`:

```
sudo -u postgres psql
```

First, generate a secure password for this new role, and keep it in your password manager.

Here we'll use the password `@MyPgPass4FeedMe`. Replace it with your actual one when running the following queries.

Create the `feedme` role and allow it to login:

```
CREATE ROLE feedme WITH PASSWORD '@MyPgPass4FeedMe';
ALTER ROLE feedme WITH LOGIN;
```

Create the `feedme` database, owned by `feedme` role:

```
CREATE DATABASE feedme OWNER feedme;
```

Edit the `pg_hba.conf` file:

```
sudo vim /etc/postgresql/11/main/pg_hba.conf
```

Locate these two lines in this file:

```
# Database administrative login by Unix domain socket
local   all             postgres                                peer
```

Just underneath them, add this line:

```
local	all             feedme                                password
```

Then restart Postgres:

```
sudo systemctl restart postgresql
```

#### Install Node.js

The [Downloads](https://nodejs.org/en/download/) page on Node.js's official website references the [Installing Node.js via package manager](https://nodejs.org/en/download/package-manager/) page, which lists options for various OSes.

The "Debian and Ubuntu based Linux distributions" section references the [NodeSource distributions](https://github.com/nodesource/distributions/blob/master/README.md). We'll follow the "Installation instructions" provided for Debian/Ubuntum and install the LTS version of Node (v14 as of March, 2021).

```
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
```

The alternatives would be to use [nvm](https://github.com/nvm-sh/nvm) or [n](https://github.com/tj/n).

#### Install PM2

> For this step and until you are told otherwise, you shoud be connected as `nodejs`.

```
su - nodejs
```

[PM2](https://pm2.keymetrics.io/) is a Node.js Process Manager.

It will take care of launching and monitoring the backend application. It'll also allow to relaunch the app automatically, should the server be rebooted.

This is where this doc differs slightly from the setup script. The setup script installs pm2 globally, using `sudo`. However it's not considered a good practice, so we'll follow the instructions provided in [this Medium post](https://medium.com/@ExplosionPills/dont-use-sudo-with-npm-still-66e609f5f92) (See "Summary").

Change the NPM's prefix for global installs:

```
npm config set prefix ~/.npm
```

Add `~/.npm/bin` to the `PATH`, and modify `.bashrc`:

```
export PATH="$HOME/.npm/bin:$PATH"
echo 'export PATH="$HOME/.npm/bin:$PATH"' >> ~/.bashrc
```

Install pm2 globally (`i` is a shorthand for `install`):

```
npm i -g pm2
```

You should now be able to launch it: `pm2`. We'll get back to it later.

#### Setup the backend application

Still under the `nodejs` account, clone the backend repository and `cd` to it:

```
git clone https://github.com/WildCodeSchool/remotefr-js-0920-p3-off-hungergames-back.git feedme-back
cd feedme-back
```

Install its dependencies with NPM:

```
npm install
```

##### Configure the app via the `.env`file

Now the app must be configured. We use the `dotenv` modules, which populates variables from a `.env` file, which is not tracked by Git.

Copy the example file `.env.sample` as `.env`:

```
cp .env.sample .env
```

Then edit it and populate the variables according to your needs. Here's my `.env` with the Postgres password given before (see explanations aftewards):

```
# Port on which the server should listen
PORT=5000

# Variable NODE_ENV utile pour prendre en compte ALLOWED_ORIGINS sinon par default localhost:8080
# NODE_ENV=production

# URLs autorisées a requeter l'api (url du front)
ALLOWED_ORIGINS=https://feedme.my-domain.com

# Add your own variables, e.g. DB_HOST, DB_USER, etc.
ROBOTOFF_API_URL=https://robotoff.domain.net/api/v1

OFF_API_URL=https://world.openfoodfacts.org/api/v0
OFF_IMAGE_URL=https://static.openfoodfacts.org/images/products

# POSTGRESQL
DB_HOST=localhost
DB_USER=feedme
DB_PASSWORD=@MyPgPass4FeedMe
DB_DATABASE=feedme
DB_PORT=5432
```

Let's break this down:

* The Postgres variables `DB_*` are consistent with the Postgres setup seen before.
* The `PORT` can be any value above 1024. Don't use port 80, since it'll be used by Nginx.
* You can leave `NODE_ENV` commented out, since it'll be set by PM2.
* In the example, `ROBOTOFF_API_URL` corresponds to an instance of Robotoff deployed on `robotoff.domain.com`, to which we append the `/api/v1` pathname.
* the `OFF_API_URL` and `OFF_IMAGE_URL` variables correspond to a setup instance of Product Opener.
* The `ALLOWED_ORIGINS` can be trickier to understand. It specifies the origin(s) accepted for CORS requests (handled by a middleware in `index.js`).

    * Suppose we wouldn't deploy FeedMe to a VPS, but to cloud services: Netlify (for the frontend app) and Heroku (for the backend app). The URL of the frontend app would be something like `https://my-feedme-instance.netlify.app`. So we would have to assign this value to `ALLOWED_ORIGINS`.
    * If you deploy FeedMe to a VPS, you can have both the backend and the frontend on the same origin (Nginx can route the incoming requests, according to the requested path). Here we suppose that we have a subdomain `feedme.my-domain.com` which will be handled by an Nginx "vhost". So we assign `https://feedme.my-domain.com` to `ALLOWED_ORIGINS` (supposing we'll use HTTPS).

##### Inject the app's database schema into Postgres

This will create the tables in the `feedme` database, from the `database/schema.sql` file:

```
psql -U feedme -d feedme < database/schema.sql
```

You'll be asked the `feedme` role's password.

##### Testing time!

Assuming you kept port 5000 in `.env`, you should be able to test the app.

Run the server in background:

```
node index.js &
```

Run cURL:

```
curl http://localhost:5000/robotoff/insights/annotate
```

Just before your prompt, you should see `[]`.

Then put the server back to the foreground with `fg`, and interrupt it with Ctrl-C.



## About this repo

This repo was created from [this template](https://github.com/bhubr/express-eslint-prettier-template), which provides:

* A basic Express app in `index.js`
* `dotenv`, a sample env file (`.env.sample`) and a `config.js` file to export config variables
* ESLint with Airbnb rules
* Prettier
* Automatic linting on commit: **you can't commit if you have ESLint errors**

## Usage

1. Install dependencies: `npm install` (alternatively, you can use Yarn or PNPM)
2. Copy `.env.sample` as `.env` and adjust it to your needs
3. Start the app on your local machine: `npm run start:dev`
