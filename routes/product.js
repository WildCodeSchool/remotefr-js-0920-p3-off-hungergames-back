const express = require('express');
const { getInfoProduct } = require('../utils/requests_off');
const { getImages } = require('../utils/utils');

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Need barcode');
});

router.get('/:barcode', (req, res, next) => {
  const { barcode } = req.params;
  const { fields } = req.query;

  console.log('\nProduct: :>> ', { barcode, fields });
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
