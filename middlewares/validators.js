const { query, checkSchema, validationResult } = require('express-validator');

const schemaQuestions = {
  sortBy: {
    in: 'query',
    optional: { options: { nullable: true } },
    matches: {
      options: [/(random|popular)/],
      errorMessage: 'Invalid sortBy [random|popular]',
    },
  },
};

const getQuestionsValidators = [
  query('insight_types').isString(),
  query('count').isInt({ min: 5, max: 99 }).optional(),
  query('lang').isString().optional(),
  query('value_tag').isString().optional(),
  query('country').isString().optional(),
  checkSchema(schemaQuestions),
];

const validateFunction = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ errors: errors.array() });
  return next();
};

module.exports = {
  getQuestionsValidators,
  validateFunction,
};
