const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const players = db.collection('players');

  let isNew = false;
  try {
    await players.doc(OPENID).get();
    await players.doc(OPENID).update({
      data: { lastLoginAt: db.serverDate() },
    });
  } catch {
    isNew = true;
    await players.doc(OPENID).set({
      data: {
        createdAt: db.serverDate(),
        lastLoginAt: db.serverDate(),
        prosperity: 0,
        flags: {},
      },
    });
  }

  return { openid: OPENID, isNew };
};
