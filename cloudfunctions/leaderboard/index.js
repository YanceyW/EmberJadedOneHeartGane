const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const gameId = event && event.gameId;
  const type = (event && event.type) || 'weekly';
  const limit = Math.min(Math.max(Number(event && event.limit) || 50, 1), 100);

  if (typeof gameId !== 'string' || !gameId) return { error: 'invalid gameId' };

  const db = cloud.database();
  const result = await db
    .collection('scores')
    .where({ gameId, type })
    .orderBy('score', 'desc')
    .limit(limit)
    .get();

  return {
    entries: result.data.map((row, index) => ({
      rank: index + 1,
      score: row.score,
      at: row.createdAt,
    })),
  };
};
