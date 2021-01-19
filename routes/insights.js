/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
/* eslint-disable no-template-curly-in-string */
const express = require('express');
const { db } = require('../config');
const { postAnnotate } = require('../utils/requests_robotoff');
const {
  getInsightId,
  createInsightId,
  updateInsightId,
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
    'Post /annotate?insight_id=${insightId}&annotation=${annotation}&update=1`',
  );
});

router.post('/annotate', async (req, res, next) => {
  const {
    body: { insight_id: insightId, annotation },
  } = req;

  res.send('OK');

  const row = await getInsightId(insightId);
  if (!row) await createInsightId(insightId, annotation);
  else if (!row.is_annotated) {
    const columnName = +annotation === 1 ? 'nb_true' : 'nb_false';
    row[columnName] += 1;

    const confirm = checkConfirmationInsight(row);
    await updateInsightId(insightId, columnName, row[columnName], confirm);
    if (confirm) {
      console.log('CONFIRMATION');
      // postAnnotate(insightId, annotation).catch((err) => {
      // TODO: prevoir table temporaire si err
      //   console.log('postAnnotate: err :>> ', err);
      // });
    }
  }
});

module.exports = router;
