const combineURLs = require('axios/lib/helpers/combineURLs');
const { OFF_IMAGE_URL, nbConfirm } = require('../config');

// Fonctions utils confirmation
const checkConfirmationInsight = (row) => {
  if (row.nb_true >= 1 + nbConfirm * (1 + row.nb_false)) return true;
  if (row.nb_false >= 1 + nbConfirm * (1 + row.nb_true)) return true;
  return false;
};

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
  return imagesDisplayUrl;
};

module.exports = {
  getImages,
  checkConfirmationInsight,
};
