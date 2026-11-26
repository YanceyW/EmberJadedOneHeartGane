const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const gameId = event && event.gameId;
  const type = (event && event.type) || 'weekly';
  const score = Number(event && event.score);

  if (typeof gameId !== 'string' || !gameId) return { error: 'invalid gameId' };
  if (!Number.isFinite(score) || score < 0 || score > 1000000000) {
    return { error: 'invalid score' };
  }

  const db = cloud.database();
  await db.collection('scores').add({
    data: {
      openid: OPENID,
      gameId,
      type,
      score,
      seed: Number(event && event.seed) || 0,
      createdAt: db.serverDate(),
    },
  });

  const higher = await db
    .collection('scores')
    .where({
      gameId,
      type,
      score: db.command.gt(score),
    })
    .count();

  return { rank: higher.total + 1, best: score };
};
