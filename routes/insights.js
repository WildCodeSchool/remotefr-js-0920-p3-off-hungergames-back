/* eslint-disable no-console */
const express = require('express');
const { matchedData } = require('express-validator');
const {
  postInsightsAnnotate,
  validateFunction,
} = require('../middlewares/validators');
const { postAnnotate } = require('../utils/requests_robotoff');
const {
  getInsightId,
  createInsightId,
  updateInsightId,
  getInsightsAnnotated,
  createInsightKeepId,
} = require('../utils/requests_db');
const { checkConfirmationInsight } = require('../utils/utils');

const router = express.Router();

router.use(
  express.urlencoded({
    extended: true,
  }),
);
router.use(express.json());

router.get('/', (req, res) => {
  res.send(
    // eslint-disable-next-line no-template-curly-in-string
    'Post /annotate?insight_id=${insightId}&annotation=${annotation}&update=1`',
  );
});

router.get('/annotate', async (req, res, next) => {
  try {
    const ids = await getInsightsAnnotated();
    res.status(200).json(ids);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/annotate',
  postInsightsAnnotate,
  validateFunction,
  async (req, res, next) => {
    const data = matchedData(req);
    const { insight_id: insightId, annotation } = data;

    try {
      const row = await getInsightId(insightId);
      if (!row) await createInsightId(insightId, annotation);
      else if (!row.is_annotated) {
        const columnName = +annotation === 1 ? 'nb_true' : 'nb_false';
        row[columnName] += 1;

        const confirm = checkConfirmationInsight(row);
        await updateInsightId(insightId, columnName, row[columnName], confirm);
        if (confirm) {
          postAnnotate(insightId, annotation).catch((err) => {
            console.log('err :>> ', err.toString());
            createInsightKeepId(insightId, annotation).catch((err2) => {
              console.log('err2 :>> ', err2.toString());
            });
          });
        }
      }
      res.send('OK');
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
