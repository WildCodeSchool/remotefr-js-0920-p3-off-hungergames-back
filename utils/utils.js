const combineURLs = require('axios/lib/helpers/combineURLs');
const { OFF_IMAGE_URL } = require('../config');

// Fonctions utils images
const BARCODE_REGEX = /(...)(...)(...)(.*)$/;
const splitBarcode = (barcode) => {
  const match = BARCODE_REGEX.exec(barcode);

  if (match !== null) {
    match.shift();
    return match;
  }

  return [barcode];
};

const getImageUrl = (imagePath) => combineURLs(OFF_IMAGE_URL, imagePath);

const getImageRootURL = (barcode) => {
  const splittedBarcode = splitBarcode(barcode);

  if (splittedBarcode === null) {
    return null;
  }

  return getImageUrl(splittedBarcode.join('/'));
};

const getImages = (data, barcode) => {
  const product = data?.product;

  const imagesDisplayUrl = [];
  if (product?.images) {
    const imageRootUrl = getImageRootURL(barcode);

    // eslint-disable-next-line no-restricted-syntax
    for (const key of Object.keys(product.images)) {
      // eslint-disable-next-line no-restricted-globals
      if (!isNaN(key)) {
        const imageUrl = `${imageRootUrl}/${key}.jpg`;
        imagesDisplayUrl.push(imageUrl);
      }
    }
  }
  console.log('imagesDisplayUrl :>> ', imagesDisplayUrl);
  return imagesDisplayUrl;
};

module.exports = {
  getImages,
};
