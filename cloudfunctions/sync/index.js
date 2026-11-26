const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function validGameId(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{1,24}$/.test(value);
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const gameId = event && event.gameId;
  const baseRevision = Number(event && event.baseRevision) || 0;
  const data = event && event.data;

  if (!validGameId(gameId)) return { error: 'invalid gameId' };
  if (!data || typeof data !== 'object') return { error: 'invalid data' };

  const db = cloud.database();
  const saves = db.collection('saves');
  const id = `${OPENID}_${gameId}`;

  let current = null;
  try {
    current = (await saves.doc(id).get()).data;
  } catch {
    // 首次同步时还没有存档。
  }

  if (!current) {
    await saves.doc(id).set({
      data: {
        openid: OPENID,
        gameId,
        revision: 1,
        updatedAt: db.serverDate(),
        data,
      },
    });
    return { revision: 1, data };
  }

  if (baseRevision !== current.revision) {
    return { revision: current.revision, data: current.data, conflict: true };
  }

  const revision = current.revision + 1;
  await saves.doc(id).update({
    data: { revision, updatedAt: db.serverDate(), data },
  });
  return { revision, data };
};
