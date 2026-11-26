const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const gameId = event && event.gameId;
  const limit = Math.min(Math.max(Number(event && event.limit) || 50, 1), 100);

  if (typeof gameId !== 'string' || !gameId) return { error: 'invalid gameId' };

  const db = cloud.database();
  const result = await db
    .collection('scores')
    .where({ gameId })
    .orderBy('score', 'desc')
    .limit(Math.min(limit * 3, 100))
    .get();

  // 兼容历史上每个玩家可能存在的多条记录，每个玩家只取最高分。
  const bestByPlayer = new Map();
  for (const row of result.data) {
    const current = bestByPlayer.get(row.openid);
    if (!current || row.score > current.score) bestByPlayer.set(row.openid, row);
  }
  const rows = [...bestByPlayer.values()].slice(0, limit);

  const players = db.collection('players');
  const names = new Map();
  for (const openid of new Set(rows.map((row) => row.openid))) {
    try {
      const player = await players.doc(openid).get();
      const name = player && player.data && player.data.displayName;
      if (typeof name === 'string' && /^王都居民-[\u4e00-\u9fa5]{2,4}$/.test(name)) {
        names.set(openid, name);
      }
    } catch {
      // 玩家资料缺失时回退到提交分数时的名字。
    }
  }

  return {
    entries: rows.map((row, index) => ({
      rank: index + 1,
      score: row.score,
      name: names.get(row.openid) || row.name || '王都居民',
      at: row.updatedAt || row.createdAt,
    })),
  };
};
