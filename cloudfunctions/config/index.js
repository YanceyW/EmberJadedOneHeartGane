const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const db = cloud.database();
  try {
    const result = await db.collection('config').doc('global').get();
    return {
      version: result.data.version || 0,
      values: result.data.values || {},
    };
  } catch {
    return { version: 0, values: {} };
  }
};
