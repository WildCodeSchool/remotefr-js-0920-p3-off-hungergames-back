const express = require('express');
const { port, origins_allowed } = require('./config');
const robotoff = require('./routes/robotoff');

const app = express();

app.use(function (req, res, next) {
  if (req.headers.origin) {
    const origin = req.headers.origin;

    if (origins_allowed.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET,POST');
      res.header('Access-Control-Allow-Credentials', true);

      next();
    } else
      res.status(403).send(`CORS Same origin (${origin}): modify config.js`);
  }
});

app.get('/', (req, res) => res.send('Express server is up and running!'));
app.use('/robotoff', robotoff);

app.listen(port, (err) => {
  if (err) throw err;
  process.stdout.write(`Express server listening on ${port}\n`);
});
