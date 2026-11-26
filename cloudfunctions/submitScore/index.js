const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const gameId = event && event.gameId;
  const score = Number(event && event.score);
  const rawName = event && event.displayName;
  const name =
    typeof rawName === 'string' && /^王都居民-[\u4e00-\u9fa5]{2,4}$/.test(rawName) ? rawName : '';

  if (typeof gameId !== 'string' || !gameId) return { error: 'invalid gameId' };
  if (!Number.isFinite(score) || score < 0 || score > 1000000000) {
    return { error: 'invalid score' };
  }

  const db = cloud.database();
  const ref = db.collection('scores').doc(`${OPENID}_${gameId}`);

  let existing = null;
  try {
    existing = (await ref.get()).data;
  } catch {
    // 首次提交时文档不存在。
  }

  const previous = Number(existing && existing.score) || 0;
  const best = Math.max(previous, score);

  if (!existing || score > previous) {
    await ref.set({
      data: {
        openid: OPENID,
        name,
        gameId,
        score,
        seed: Number(event && event.seed) || 0,
        updatedAt: db.serverDate(),
      },
    });
  }

  // scores 每个玩家每款游戏只保留一条记录，因此排名直接按最高分统计。
  const higher = await db
    .collection('scores')
    .where({
      gameId,
      score: db.command.gt(best),
    })
    .count();

  return { rank: higher.total + 1, best };
};
