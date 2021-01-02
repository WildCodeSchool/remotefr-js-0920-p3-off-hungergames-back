const express = require('express');
const { port } = require('./config');
const robotoff = require('./routes/robotoff');

const app = express();

app.get('/', (req, res) => res.send('Express server is up and running!'));
app.use('/robotoff', robotoff);

app.listen(port, (err) => {
  if (err) throw err;
  process.stdout.write(`Express server listening on ${port}\n`);
});
