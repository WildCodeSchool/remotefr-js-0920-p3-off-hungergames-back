const { CronJob } = require('cron');
const { getInsightKeep, deleteInsightKeepId } = require('./requests_db');
const { postAnnotate } = require('./requests_robotoff');

// '0 */4 * * *' toutes les 4h
// '*/2 * * * *' toutes les 2min
const initCron = () => {
  const job = new CronJob('0 */4 * * *', () => {
    getInsightKeep()
      .then((results) => {
        results.forEach(({ insight_id: insightId, annotate }) => {
          postAnnotate(insightId, annotate)
            .then(() => {
              deleteInsightKeepId(insightId);
            })
            .catch((err) => {
              console.log('err 1 :>> ', err.toString());
            });
        });
      })
      .catch((err) => {
        console.log('err 2 :>> ', err.toString());
      });
  });
  job.start();
};

module.exports = {
  initCron,
};
