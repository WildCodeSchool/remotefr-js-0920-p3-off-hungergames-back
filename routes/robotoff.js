const express = require('express');
const questions = require('./questions');
const product = require('./product');

const router = express.Router();

router.get('/', (req, res) => res.send('Robotoff ! '));

router.use('/questions', questions);
router.use('/product', product);

module.exports = router;
