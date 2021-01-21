const {
  query,
  checkSchema,
  validationResult,
  body,
} = require('express-validator');

const schemaQuestions = {
  sortBy: {
    in: 'query',
    optional: { options: { nullable: true } },
    matches: {
      options: [/(random|popular)/],
      errorMessage: 'Invalid sortBy - [random|popular]',
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

const schemaProduct = {
  barcode: {
    in: 'params',
    matches: {
      options: [/^[0-9]{8,14}$/],
      errorMessage: 'Invalid barcode - 8..14 digits',
    },
  },
};

const getProductValidators = [
  checkSchema(schemaProduct),
  query('fields').isString().optional(),
];

const postInsightsAnnotate = [
  body('insight_id').isString().isLength({ min: 36, max: 36 }),
  body('annotation').isInt({ min: 0, max: 1 }),
];

const validateFunction = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ errors: errors.array() });
  return next();
};

module.exports = {
  getQuestionsValidators,
  getProductValidators,
  postInsightsAnnotate,
  validateFunction,
};
