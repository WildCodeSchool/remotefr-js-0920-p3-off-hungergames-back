/* eslint-disable prefer-destructuring */
/* eslint-disable no-console */
const axios = require('axios');
const { ROBOTOFF_API_URL } = require('../config');

const removeEmptyKeys = (obj) => {
  Object.keys(obj).forEach(
    // eslint-disable-next-line no-param-reassign
    (key) => (obj[key] === undefined || obj[key] === '') && delete obj[key],
  );
  return obj;
};

module.exports = {
  postAnnotate(insightId, annotation) {
    const config = {
      method: 'post',
      url: `${ROBOTOFF_API_URL}/insights/annotate`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: new URLSearchParams(
        `insight_id=${insightId}&annotation=${annotation}&update=1`,
      ),
    };

    return axios(config).then((result) => result.data);
  },

  getQuestions(
    count = 10,
    lang = 'fr',
    insightTypes,
    valueTag = '',
    country = '',
    sortBy = 'random',
  ) {
    return axios
      .get(`${ROBOTOFF_API_URL}/questions/${sortBy}`, {
        params: removeEmptyKeys({
          count,
          lang,
          insight_types: insightTypes,
          value_tag: valueTag,
          country,
        }),
      })
      .then((result) => {
        const questions = result.data.questions;
        // eslint-disable-next-line no-param-reassign
        result.data.questions = questions.filter(
          (question) => question.source_image_url,
        );
        return result.data;
      });
  },
};
