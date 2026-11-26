const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  await db.collection('saves').where({ openid: OPENID }).remove();
  await db.collection('scores').where({ openid: OPENID }).remove();
  try {
    await db.collection('players').doc(OPENID).remove();
  } catch {
    // 玩家不存在时也视为删除成功。
  }

  return { ok: true };
};
