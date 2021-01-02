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

const getImageUrl = (imagePath) => {
  return combineURLs(OFF_IMAGE_URL, imagePath);
};

const getImageRootURL = (barcode) => {
  const splittedBarcode = splitBarcode(barcode);

  if (splittedBarcode === null) {
    return null;
  }

  return getImageUrl(splittedBarcode.join('/'));
};

module.exports = {
  getImageRootURL,
};
