const express = require('express');
const { matchedData } = require('express-validator');
const { getInfoProduct } = require('../utils/requests_off');
const { getImages } = require('../utils/utils');
const {
  getProductValidators,
  validateFunction,
} = require('../middlewares/validators');

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Need barcode');
});

router.get(
  '/:barcode',
  getProductValidators,
  validateFunction,
  (req, res, next) => {
    const { barcode, fields } = matchedData(req);

  getInfoProduct(barcode, fields)
    .then((data) => {
      if (!data.status) return res.status(404).json(data);
      if (fields === 'images') {
        const imagesDisplayUrl = getImages(data, barcode);
        return res.json(imagesDisplayUrl);
      }
      return res.json(data);
    })
    .catch(next);
});

module.exports = router;
