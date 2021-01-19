const express = require('express');
const { getInfoProduct } = require('../utils/requests_off');
const { getImages } = require('../utils/utils');

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Need barcode');
});

router.get('/:barcode', (req, res) => {
  const { barcode } = req.params;
  const { fields } = req.query;

  console.log('\nProduct: :>> ', { barcode, fields });
  getInfoProduct(barcode, fields)
    .then((data) => {
      if (fields === 'images') {
        const imagesDisplayUrl = getImages(data, barcode);
        res.json(imagesDisplayUrl);
      } else res.json(data);
    })
    .catch((err) => {
      res.status(404).json(err);
    });
});

module.exports = router;
