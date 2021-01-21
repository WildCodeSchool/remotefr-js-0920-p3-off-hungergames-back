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

    console.log('\nProduct: :>> ', { barcode, fields });
    getInfoProduct(barcode, fields)
      .then((data) => {
        if (!data.status) res.status(404).json(data);
        else if (fields === 'images') {
          const imagesDisplayUrl = getImages(data, barcode);
          res.json(imagesDisplayUrl);
        } else res.json(data);
      })
      .catch(next);
  },
);

module.exports = router;
