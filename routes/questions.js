const express = require('express');
const { getQuestions } = require('../utils/requests_robotoff');

const router = express.Router();

router.get('/', (req, res) => {
  console.log('\nQuestions: req.query :>> ', req.query);

  const { count, lang, insight_types, value_tag, country } = req.query;

  getQuestions(count, lang, insight_types, value_tag, country)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.status(404).json(err);
    });
});

module.exports = router;
