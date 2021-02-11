# Open Food Facts - Feed Me! (backend/API)

## Deploying on a production server

You can use our [install script](scripts/install.sh) to set up the backend *and* the frontend apps at once, on a Debian Buster server.

1. SSH to your server
2. Become root : `su -`
3. Install curl and vim (or your favorite text editor): `apt-get install -y curl vim`
4. Download the install script: `curl -L -o install.sh http://bit.do/off-feedme-tempinstall` (**TODO** replace with definitive URL)
5. Edit params in the header section of `install.sh`, especially `UNIXUSERPASS` and `PGPASS`.
6. Run the script: `bash install.sh`

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
