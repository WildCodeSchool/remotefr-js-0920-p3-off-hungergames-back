const { db } = require('../config');

// Table insight
const getInsightsAnnotated = async () => {
  const { rows } = await db.query(
    'SELECT insight_id FROM insight where is_annotated',
  );

  return rows.map((el) => el.insight_id);
};

const getInsightId = async (insightId) => {
  const { rows } = await db.query(
    'SELECT * FROM insight WHERE insight_id = $1',
    [insightId],
  );

  return rows[0] || null;
};

const createInsightId = async (insightId, annotation) => {
  const nbTrue = +annotation === 1 ? 1 : 0;
  const nbFalse = +annotation === 0 ? 1 : 0;

  const results = await db.query(
    'INSERT INTO insight (insight_id, nb_true, nb_false) VALUES ($1, $2, $3)',
    [insightId, nbTrue, nbFalse],
  );

  return results;
};

const updateInsightId = async (insightId, columnName, value, isAnnotated) => {
  let querySQL = `UPDATE insight SET ${columnName} = $1`;
  if (isAnnotated) querySQL += `, is_annotated = true`;
  querySQL += ` WHERE insight_id = $2`;

  const results = await db.query(querySQL, [value, insightId]);

  return results;
};

const deleteInsightId = async (insightId) => {
  const results = await db.query('DELETE FROM insight WHERE insight_id = $1', [
    insightId,
  ]);

  return results;
};

// Table insight_keep

const getInsightKeep = async () => {
  const { rows } = await db.query(
    'SELECT insight_id, annotate FROM insight_keep',
  );

  return rows;
};

const createInsightKeepId = async (insight_id, annotation) => {
  const results = await db.query(
    'INSERT INTO insight_keep (insight_id, annotate) VALUES ($1, $2)',
    [insight_id, annotation],
  );

  return results;
};

const deleteInsightKeepId = async (insight_id) => {
  const results = await db.query(
    'DELETE FROM insight_keep WHERE insight_id = $1',
    [insight_id],
  );

  return results;
};

module.exports = {
  getInsightId,
  createInsightId,
  updateInsightId,
  deleteInsightId,
  getInsightsAnnotated,
  createInsightKeepId,
  getInsightKeep,
  deleteInsightKeepId,
};
