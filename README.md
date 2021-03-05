# Open Food Facts - Feed Me! (backend/API)

## Deploying on a staging/production server

There are three proposed options (though you may investigate others, such as [Dokku](https://dokku.com/) and [CapRover](https://caprover.com/)):

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

> :warning: On a staging server, you should consider using [Let's Encrypt](https://letsencrypt.org). The install script doesn't address this: it was first intended for setting up the actual production server. The production server itself is behind an Nginx reverse proxy which handles HTTPS. We'll get into more details in the "Option 2" section, if you want to setup HTTPS.

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

You may want to commit the changes made to this file via Etckeeper, by placing yourself in the `/etc` folder, and running:

```
sudo git commit -am "Allow access to pg role feedme via password method"
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

> From this step, and until you are told otherwise, you shoud be connected as `nodejs`.

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

Check that you are located under the `/home/nodejs` directory (`pwd`).

Clone the backend repository and `cd` to it:

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
    * Regarding HTTPS: if you don't intend to setup HTTPS, this should be reflected in the actual URL you'll be using in replacement of `https://feedme.my-domain.com`, _for this and all the subsequent sections of this procedure_.

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

##### Run the app with PM2

PM2 can use an "ecosystem" file, in which you can define which app(s) to run, set environment variables for each one, etc. This will run the app in production mode:

```
pm2 start ecosystem.config.js --env production
```

This should output the status of the PM2-managed apps:

```
[PM2] Spawning PM2 daemon with pm2_home=/home/nodejs/.pm2
[PM2] PM2 Successfully daemonized
[PM2][WARN] Applications off-feedme-api not running, starting...
[PM2] App [off-feedme-api] launched (1 instances)
┌─────┬───────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name              │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼───────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ off-feedme-api    │ default     │ 1.0.0   │ fork    │ 1091     │ 0s     │ 0    │ online    │ 0%       │ 31.6mb   │ nodejs   │ disabled │
└─────┴───────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

The information displayed here includes:

* `id` (auto-incremented) which can be used as a shorthand to get logs on a specific app
* `name`
* `uptime`: time the app has been up & running
* `↺`: number of restarts

> You can get this output anytime by running `pm2 status`. Try it and check the `uptime` and `↺` columns: the app should have been running for at least a few seconds, and not have been restarted.

Here's an example of `pm2 status` output indicating an error:

```
┌─────┬───────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name              │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼───────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ off-feedme-api    │ default     │ 1.0.0   │ fork    │ 0        │ 0      │ 15   │ errored   │ 0%       │ 0b       │ nodejs   │ disabled │
└─────┴───────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

Should this happen, you can check the logs by using `pm2 log <id or name>`. E.g. `pm2 log 0` or `pm2 log off-feedme-api`, which in my case, gives this output:

```
[TAILING] Tailing last 15 lines for [0] process (change the value with --lines option)
/home/nodejs/.pm2/logs/off-feedme-api-out.log last 15 lines:
/home/nodejs/.pm2/logs/off-feedme-api-error.log last 15 lines:
0|off-feed |     at listenInCluster (net.js:1366:12)
0|off-feed |     at Server.listen (net.js:1452:7)
0|off-feed |     at Function.listen (/home/nodejs/feedme-back/node_modules/express/lib/application.js:618:24)
0|off-feed |     at Object.<anonymous> (/home/nodejs/feedme-back/index.js:35:5)
0|off-feed |     at Module._compile (internal/modules/cjs/loader.js:1063:30)
0|off-feed |     at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)
0|off-feed |     at Module.load (internal/modules/cjs/loader.js:928:32)
0|off-feed |     at Function.Module._load (internal/modules/cjs/loader.js:769:14)
0|off-feed |     at Object.<anonymous> (/home/nodejs/.npm/lib/node_modules/pm2/lib/ProcessContainerFork.js:33:23) {
0|off-feed |   code: 'EADDRINUSE',
0|off-feed |   errno: -98,
0|off-feed |   syscall: 'listen',
0|off-feed |   address: '::',
0|off-feed |   port: 5000
0|off-feed | }
```

It so happened that I had forgotten to kill a server already launched in the background.

> When the app crashes, **pm2 restarts it automatically**. While this is useful, you can end up having a huge amount of restarts, which doesn't sound good. In that case, better stop the app while you investigate the reasons for the crash: `pm2 stop 0`.

In my case, I could either use `sudo fuser -k 5000/tcp`, or use `sudo ps aux | grep node` to locate its PID, then use `kill -9 <pid>`. After that, I could restart the app with `pm2 start 0` (no need to specify production environment, since it was done when we invoked `pm2 start` with the ecosystem file).

Checking back the logs, I can run `pm2 status` and `pm2 log 0 --lines 5`. I now have a green line indicating that the server is running:

```
[TAILING] Tailing last 5 lines for [0] process (change the value with --lines option)
/home/nodejs/.pm2/logs/off-feedme-api-error.log last 5 lines:
0|off-feed |   errno: -98,
0|off-feed |   syscall: 'listen',
0|off-feed |   address: '::',
0|off-feed |   port: 5000
0|off-feed | }

/home/nodejs/.pm2/logs/off-feedme-api-out.log last 5 lines:
0|off-feed | Express server listening on 5000
```

##### Manage the app as a service

If we leave it as is, the backend won't restart when the server reboots. PM2 has our back here, and makes it very simple to manage an app as a service.

Run this command to generate a "startup script":

```
pm2 startup
```

This outputs:

```
[PM2] Init System found: systemd
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /home/nodejs/.npm/lib/node_modules/pm2/bin/pm2 startup systemd -u nodejs --hp /home/nodejs
```

As instructed, you must copy/paste the last line, but you need sudo privileges for that. Get back to your account that has them and run:

```
sudo env PATH=$PATH:/usr/bin /home/nodejs/.npm/lib/node_modules/pm2/bin/pm2 startup systemd -u nodejs --hp /home/nodejs
```

This will give a long output (some of it has been truncated here):

```
[PM2] Init System found: systemd
Platform systemd
Template
[Unit]
Description=PM2 process manager
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=nodejs
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games:/usr/bin:/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
Environment=PM2_HOME=/home/nodejs/.pm2
PIDFile=/home/nodejs/.pm2/pm2.pid
Restart=on-failure

ExecStart=/home/nodejs/.npm/lib/node_modules/pm2/bin/pm2 resurrect
ExecReload=/home/nodejs/.npm/lib/node_modules/pm2/bin/pm2 reload all
ExecStop=/home/nodejs/.npm/lib/node_modules/pm2/bin/pm2 kill

[Install]
WantedBy=multi-user.target

Target path
/etc/systemd/system/pm2-nodejs.service
Command list
[ 'systemctl enable pm2-nodejs' ]
[PM2] Writing init configuration in /etc/systemd/system/pm2-nodejs.service
[PM2] Making script booting at startup...
[PM2] [-] Executing: systemctl enable pm2-nodejs...
Created symlink /etc/systemd/system/multi-user.target.wants/pm2-nodejs.service → /etc/systemd/system/pm2-nodejs.service.
[PM2] [v] Command successfully executed.
+---------------------------------------+
[PM2] Freeze a process list on reboot via:
$ pm2 save

[PM2] Remove init script via:
$ pm2 unstartup systemd
```

If you reboot your server, the app will be start automatically via systemd. You're **done** with the backend part :tada:.

#### Setup the frontend app.

Make sure you get back to the `nodejs` account and the `/home/nodejs` directory.

Clone the GitHub repository and `cd` to it:

```
git clone https://github.com/WildCodeSchool/remotefr-js-0920-p3-off-hungergames-front.git feedme-front
cd feedme-front
```

Install its dependencies with NPM:

```
npm install
```

##### Configure the app via the `.env.local` file

Vue apps can be configured by the means of ["env" files](https://cli.vuejs.org/guide/mode-and-env.html#environment-variables). There might be several of them, which allows to have common values in one, and overriding/adding some of them in another.

We'll use `.env.local`. Create it by copying the example file:

```
cp .env.local.sample .env.local
```

Then edit it, and set the variables according to your needs. Following is an example. Assuming, as we do, that we'll deploy the backend and frontend to the same domain/origin`feedme.my-domain.com`, here's our `.env.local`:

```
VUE_APP_BACK_API_NODE=https://feedme.my-domain.com/robotoff
VUE_APP_WEBSITE_URL=https://feedme.my-domain.com
```

##### Build the production bundle

The app's constituents (`.vue` files) are to be bundled together by Webpack. This will produce:

* One `js` file containing the libraries,
* One `js` file containing the app itself,
* Once `css` file

This is all achieved by running:

```
npm run build
```

The build will be located under the `dist` directory. You can run `find dist` to check its content:

```
dist/
dist/img
dist/img/icomoon.b004ec98.svg
dist/img/yes.ff46f484.svg
dist/img/burger.e109f5b5.svg
dist/img/back.6da16e16.svg
dist/img/no.89068b0f.svg
dist/manifest.json
dist/js
dist/js/chunk-vendors.4aaa8d07.js.map
dist/js/app.db2e1954.js.map
dist/js/app.db2e1954.js
dist/js/chunk-vendors.4aaa8d07.js
dist/maskable_icon_x384.png
dist/maskable_icon_x256.png
dist/icon_x64.ico
dist/index.html
dist/maskable_icon_x152.png
dist/_redirects
dist/css
dist/css/app.f8759978.css
dist/maskable_icon_x512.png
```

The build is basically a set of static assets: an `index.html`, JavaScript and CSS files, along with images.

#### Setup the web server

**TODO**

1. Don't remove the `default` vhost right away
2. Instead, generate SSL cert with certbot or acme.sh
3. Remove the `default` vhost and use the `feedme` vhost WITH https

The last step is to setup Nginx so as to:

* Serve the frontend app's `dist` directory`
* Route all requests under the `/robotoff` path to the backend app

Get back to your user account that has sudo privileges, and install Nginx:

```
sudo apt-get install -y nginx
```

Whether you intend to enable HTTPS or not, follow this section.

##### Enable HTTP vhost for your domain/sub-domain

Then copy the `feedme-nginx-http.conf` file, from the `scripts` directory, to the directory where Nginx's "virtual hosts" are stored:

```
sudo cp /home/nodejs/feedme-back/scripts/feedme-nginx-http.conf /etc/nginx/sites-available/feedme
```

Create a symbolic link from this file to `/etc/nginx/sites-enabled`, where Nginx's _active_ vhosts are located:

```
sudo ln -s /etc/nginx/sites-available/feedme /etc/nginx/sites-enabled/
```

Remove the `default` symlink from `sites-enabled`, since we don't need the default Nginx vhost anymore:

```
sudo rm /etc/nginx/sites-enabled/default
```

Reload Nginx's configuration, for these changes to take effect:

```
sudo systemctl reload nginx
```

You should be able to access your FeedMe instance via `http://feedme.my-domain.com`.

**If you configured the apps to use http**, it should work fine, and you should see product images displayed. You're done, congrats :confetti_ball:!

If you configured them with the `https` prefix, continue on to the next section

##### Enable HTTPS with Let's Encrypt

First, you have to install either [certbot](https://certbot.eff.org/) (official Let's Encrypt client) or [acme.sh](https://github.com/acmesh-official/acme.sh) (a Shell client).

> :warning: Opinionated statement: I don't really like Snap, which is now the default way to install Certbot on Debian/Ubuntu. However, you can still choose _Nginx_ on _Other Linux (pip)_ in the certbot instructions. As for me, I went for acme.sh. That being said, my previous experience with Certbot was fairly good: it has interesting features, like automatic cron setup for certificate renewal, and automatic update of the Nginx vhost.

I'll describe the procedure for acme.sh, but _strongly_ encourage you to carefully read [acme.sh's README](https://github.com/acmesh-official/acme.sh) as you go through each step.

###### 1. Install acme.sh

First, from your account with sudo privileges, login as `root`: `sudo su -`.

Then run this command, **replacing the email with your own, valid email**. This will install acme.sh under the `~/.acme.sh` folder:

```
curl https://get.acme.sh | sh -s email=admin@my-domain.com
```

###### 2. Issue a certificate

Run this command, replacing the domain with your own:

```
.acme.sh/acme.sh --issue -d feedme.my-domain.com -w /var/www/letsencrypt
```

You should see an output similar to this:

```
root@debianvm:~# .acme.sh/acme.sh --issue -d feedme.my-domain.com -w /var/www/letsencrypt
[Fri 05 Mar 2021 07:57:34 AM EST] Using CA: https://acme-v02.api.letsencrypt.org/directory
[Fri 05 Mar 2021 07:57:34 AM EST] Single domain='feedme.my-domain.com'
[Fri 05 Mar 2021 07:57:34 AM EST] Getting domain auth token for each domain
[Fri 05 Mar 2021 07:57:39 AM EST] Getting webroot for domain='feedme.my-domain.com'
[Fri 05 Mar 2021 07:57:40 AM EST] Verifying: feedme.my-domain.com
[Fri 05 Mar 2021 07:57:43 AM EST] Pending
[Fri 05 Mar 2021 07:57:46 AM EST] Success
[Fri 05 Mar 2021 07:57:46 AM EST] Verify finished, start to sign.
[Fri 05 Mar 2021 07:57:46 AM EST] Lets finalize the order.
[Fri 05 Mar 2021 07:57:46 AM EST] Le_OrderFinalize='https://acme-v02.api.letsencrypt.org/acme/finalize/114722983/8269760772'
[Fri 05 Mar 2021 07:57:48 AM EST] Downloading cert.
[Fri 05 Mar 2021 07:57:48 AM EST] Le_LinkCert='https://acme-v02.api.letsencrypt.org/acme/cert/0430b7158d58e7ed4f69a6220d52ddbc40c9'
[Fri 05 Mar 2021 07:57:48 AM EST] Cert success.
-----BEGIN CERTIFICATE-----
MIIFHzCCBAegAwIBAgISBDC3FY1Y5+1PaaYiDVLdvEDJMA0GCSqGSIb3DQEBCwUA
MDIxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQswCQYDVQQD
EwJSMzAeFw0yMTAzMDUxMTU3NDdaFw0yMTA2MDMxMTU3NDdaMBgxFjAUBgNVBAMT
DWZlZWRtZS5qc3guZnIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDM
sKz3L9I6WnNHp3MY/KqKvah6nQixZYo7F8Veuf9lm70+MnvqJlDO78q+eszBFA7v
8UFi2MwopGG98RE0ZAoFEh5XBZRFoVgOofrnV2bkRhNHJ3hzWMF3dmoLhQlIleoq
irmiRkEiN5JPeX+ZY/PNtsJEXzs49RyzJSh+6N2qIQqfwpicMIrHm87i9ru/HKjD
8mBuAYkPCIjnE4fXlb+EETFDLMKfy0uje4mj6cUbgXMr9Ra2AkjbV8YcFG/Ycxce
4YYa2oy1j0V/fclhk+jdJSdnizgEDiLlX0sCO39YXYTBcjEVc4wCeHKqBB1jC7S/
WizS+R3BqgOvWU3COrH/AgMBAAGjggJHMIICQzAOBgNVHQ8BAf8EBAMCBaAwHQYD
VR0lBBYwFAYIKwYBBQUHAwEGCCsGAQUFBwMCMAwGA1UdEwEB/wQCMAAwHQYDVR0O
BBYEFLPXzLr5o15/hzRmwwyaImSGtCDDMB8GA1UdIwQYMBaAFBQusxe3WFbLrlAJ
QOYfr52LFMLGMFUGCCsGAQUFBwEBBEkwRzAhBggrBgEFBQcwAYYVaHR0cDovL3Iz
Lm8ubGVuY3Iub3JnMCIGCCsGAQUFBzAChhZodHRwOi8vcjMuaS5sZW5jci5vcmcv
MBgGA1UdEQQRMA+CDWZlZWRtZS5qc3guZnIwTAYDVR0gBEUwQzAIBgZngQwBAgEw
NwYLKwYBBAGC3xMBAQEwKDAmBggrBgEFBQcCARYaaHR0cDovL2Nwcy5sZXRzZW5j
cnlwdC5vcmcwggEDBgorBgEEAdZ5AgQCBIH0BIHxAO8AdQBElGUusO7Or8RAB9io
/ijA2uaCvtjLMbU/0zOWtbaBqAAAAXgCdytfAAAEAwBGMEQCIFs3S/C+Rx2JKDAh
2/mRrjzb0Z7ZvgSxZ7ekUCAaWsdBAiA+jU6d2OdTqlKWnaovn63s906dtTigBw40
NHmR9Z8EMgB2AH0+8viP/4hVaCTCwMqeUol5K8UOeAl/LmqXaJl+IvDXAAABeAJ3
K30AAAQDAEcwRQIhAIvrTkUYZgUPhXxAJI321Jr/W6pJGfkrC0917ZOyjRTvAiAT
UWu5DEI8LLEWrPxGQCp/kiXUHeWAGORkenHxj4qwqzANBgkqhkiG9w0BAQsFAAOC
AQEAidHu968tovn4/LkIyK1aFy31t4GzZgd7Ojk6PuMGh+S5frJUcViv/ItAdrJC
vQXwH6IWQhNXLEZrkOELZOQFSEJ/02JvuVHbQzU0Ex7/vWMVCBA5txB1tX6kc+4h
tpOAwxtiG5miO60L8+oOtxYh4jg6j5J6dETBWWfzb9C8TmGdYl66agR0W0yeRaFg
+vU0NJqk6OdrcUKeoGlSXEKu0Kw3H8S/aEo0hex7kyl9KDz7LY49b3DiG5vfh9jY
1xlHF+2q/OM87YbFKQfQRA4eq+FNDeEsCi6FIVqN33l5v3Kkc4jgsLtF5MPcY97e
0/PlDa9teUAA9SGjpimeAcJTww==
-----END CERTIFICATE-----
[Fri 05 Mar 2021 07:57:48 AM EST] Your cert is in  /root/.acme.sh/feedme.my-domain.com/feedme.my-domain.com.cer
[Fri 05 Mar 2021 07:57:48 AM EST] Your cert key is in  /root/.acme.sh/feedme.my-domain.com/feedme.my-domain.com.key
[Fri 05 Mar 2021 07:57:48 AM EST] The intermediate CA cert is in  /root/.acme.sh/feedme.my-domain.com/ca.cer
[Fri 05 Mar 2021 07:57:48 AM EST] And the full chain certs is there:  /root/.acme.sh/feedme.my-domain.com/fullchain.cer
```

Note that paths to the certificate key and certificate file are indicated here, but you **mustn't use them for the next commmand**.

###### 3. Install the certificate

Now, the certificate exists, but you have to configure Nginx to use it.

**First**, and I cannot emphasize this enough, you must **copy** the cert files from the `~/.acme.sh/feedme.my-domain.com` folder to another location. You will lose your certs if you provide their paths to the "install cert" command coming next.

Create a folder under `/var/www/letsencrypt`:

```
mkdir -p /var/www/letsencrypt/feedme.my-domain.com
```

Then copy the key file and the fullchain file to their location:

```
cp /root/.acme.sh/feedme.my-domain.com/feedme.my-domain.com.key /var/www/letsencrypt/feedme.my-domain.com/
cp /root/.acme.sh/feedme.my-domain.com/fullchain.cer /var/www/letsencrypt/feedme.my-domain.com/
```

Second, you need to **replace** the vhost created before (intended for HTTP) with another (for HTTPS):

```
cp /home/nodejs/feedme-back/scripts/feedme-nginx-ssl.conf /etc/nginx/sites-available/feedme
```

You then need to edit this file to replace all the occurrences of `DOMAIN` with your actual domain. You can do this using this Perl one-liner (replacing `feedme.my-domain.com` with your domain):

```
perl -pi -e 's/DOMAIN/feedme.my-domain.com/g' /etc/nginx/sites-available/feedme
```

Last, you can install the certificate files (key and fullchain) by specifying their location, under `/var/www/letsencrypt/feedme.my-domain.com`:

```
acme.sh --install-cert -d feedme.my-domain.com \
--key-file       /var/www/letsencrypt/feedme.my-domain.com/feedme.my-domain.com.key  \
--fullchain-file /var/www/letsencrypt/feedme.my-domain.com/fullchain.cer \
--reloadcmd     "service nginx force-reload"
```

That should be it! Congrats if you made it this far!

**We won't cover certificate renewal, but it's explained in the doc.**

## Administration / Maintenance

### Re-deploying after code updates

**WIP**

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
