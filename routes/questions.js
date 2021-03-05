/* eslint-disable camelcase */
const express = require('express');
const { matchedData, query } = require('express-validator');
const { getQuestions } = require('../utils/requests_robotoff');
const {
  getQuestionsValidators,
  validateFunction,
} = require('../middlewares/validators');

const router = express.Router();

// eslint-disable-next-line no-unused-vars
router.get('/', getQuestionsValidators, validateFunction, (req, res, next) => {
  const dataQuery = matchedData(req, { location: query });
  const { count, lang, insight_types, value_tag, country, sortBy } = dataQuery;

  getQuestions(count, lang, insight_types, value_tag, country, sortBy)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.status(404).json({ error: err.toString() });
    });
});

module.exports = router;
