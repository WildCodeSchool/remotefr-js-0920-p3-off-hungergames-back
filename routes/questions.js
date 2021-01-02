const express = require('express');
const { ROBOTOFF_API_URL } = require('./config');

const router = express.Router();

router.get('/', (req, res) => res.send('Questions !'));

module.exports = router;
