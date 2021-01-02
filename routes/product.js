const express = require('express');
const { getInfoProduct } = require('../utils/requests_off');
const { getImageRootURL } = require('../utils/utils');

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Need barcode');
});

router.get('/:barcode', async (req, res) => {
  console.log('\nProduct: barcode :>> ', req.params.barcode);
  if (req.query.fields === 'images')
    return res.redirect(`./${req.params.barcode}/images`);

  const data = await getInfoProduct(req.params.barcode, req.query.fields);
  res.json({ data });
});

router.get('/:barcode/images', async (req, res) => {
  const data = await getInfoProduct(req.params.barcode, 'images');
  const product = data?.product;

  const imagesDisplayUrl = [];
  if (product?.images) {
    const imageRootUrl = getImageRootURL(req.params.barcode);

    for (const key of Object.keys(product.images)) {
      if (!isNaN(key)) {
        const imageUrl = `${imageRootUrl}/${key}.jpg`;
        imagesDisplayUrl.push(imageUrl);
      }
    }
  }
  res.json(imagesDisplayUrl);
});

module.exports = router;
