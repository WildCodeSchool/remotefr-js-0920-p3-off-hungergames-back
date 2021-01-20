const CronJob = require('cron').CronJob;
const { getInsightKeep, deleteInsightKeepId } = require('./requests_db');
const { postAnnotate } = require('./requests_robotoff');

// '0 */4 * * *' toutes les 4h
const initCron = () => {
  const job = new CronJob('0 */4 * * *', function () {
    getInsightKeep().then((results) => {
      results.forEach(({ insight_id, annotate }, id) => {
        postAnnotate(insight_id, annotate)
          .then((data) => {
            deleteInsightKeepId(insight_id);
          })
          .catch((err) => {
            console.log('err :>> ', err);
          });
      });
    });
  });

  job.start();
};

module.exports = {
  initCron,
};
