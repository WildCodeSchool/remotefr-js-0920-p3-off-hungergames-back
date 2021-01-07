const axios = require('axios');
const { OFF_API_URL } = require('../config');

module.exports = {
  getInfoProduct(barcode, fields) {
    const params = {};
    if (fields) {
      params.fields = fields;
    }
    return axios
      .get(`${OFF_API_URL}/product/${barcode}.json`, { params })
      .then((result) => result.data);
  },
};
