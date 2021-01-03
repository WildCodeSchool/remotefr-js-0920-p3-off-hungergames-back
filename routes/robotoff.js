const express = require('express');
const questions = require('./questions');
const product = require('./product');
const insights = require('./insights');

const router = express.Router();

router.get('/', (req, res) => res.send('Robotoff ! '));

router.use('/questions', questions);
router.use('/product', product);
router.use('/insights', insights);

module.exports = router;
