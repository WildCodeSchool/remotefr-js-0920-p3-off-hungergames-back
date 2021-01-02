const express = require('express');
const { getQuestions } = require('../utils/requests_robotoff');

const router = express.Router();

router.get('/', async (req, res) => {
  console.log('\nQuestions: req.query :>> ', req.query);

  const { count, lang, insight_types, value_tag, country } = req.query;

  const data = await getQuestions(
    count,
    lang,
    insight_types,
    value_tag,
    country,
  );

  res.json(data);
});

module.exports = router;
