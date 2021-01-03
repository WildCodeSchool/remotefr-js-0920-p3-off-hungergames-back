const express = require('express');
const { postAnnotate } = require('../utils/requests_robotoff');

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

router.post('/annotate', (req, res) => {
  console.log('\nInsights/annotate: req.body :>> ', req.body);

  postAnnotate(req.body.insight_id, req.body.annotation)
    .then((response) => {
      res.json(response.data);
    })
    .catch((err) => {
      res.status(404).json(err);
    });
});

module.exports = router;
