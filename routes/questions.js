const express = require('express');
const { getQuestions } = require('../utils/requests_robotoff');

const router = express.Router();

router.get('/', (req, res) => {
  console.log('\nQuestions: req.query :>> ', req.query);

  // eslint-disable-next-line camelcase
  const { count, lang, insight_types, value_tag, country, sortBy } = req.query;

  getQuestions(count, lang, insight_types, value_tag, country, sortBy)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.status(404).json(err);
    });
});

module.exports = router;
