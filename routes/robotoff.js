const express = require('express');
const questions = require('./questions');

const router = express.Router();

router.get('/', (req, res) => res.send('Robotoff ! '));
router.use('/questions', questions);

module.exports = router;
