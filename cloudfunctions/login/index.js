'use strict';

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const PLAYER_NAME_PREFIX = '王都居民-';
const FIRST = '桃小团栗星花布奶青麦柚汤酥云糖南杏月鹿果豆芝阿初';
const SECOND = '酥满团子糖野卷丁盖芽圆朵豆瓜仁亮鹿果月云花栗杏柚';

function isValidDisplayName(value) {
  if (typeof value !== 'string' || !value.startsWith(PLAYER_NAME_PREFIX)) return false;
  const short = value.slice(PLAYER_NAME_PREFIX.length);
  return short.length >= 2 && short.length <= 4 && /^[\u4e00-\u9fa5]+$/.test(short);
}

function randomTwoChar() {
  const first = FIRST[Math.floor(Math.random() * FIRST.length)];
  const second = SECOND[Math.floor(Math.random() * SECOND.length)];
  return `${first}${second}`;
}

function randomName() {
  const first = randomTwoChar();
  return `${PLAYER_NAME_PREFIX}${Math.random() < 0.35 ? first : `${first}${randomTwoChar()}`}`;
}

async function nameOwner(displayName) {
  const result = await db.collection('players').where({ displayName }).limit(1).get();
  return result.data[0] || null;
}

/**
 * 复用 players 集合保存唯一展示名，不再维护额外的占位集合。
 * 极端并发下仍可能出现同名，但不会阻塞登录或写入额外数据。
 */
async function pickDisplayName(openid, preferredName) {
  if (isValidDisplayName(preferredName)) {
    const owner = await nameOwner(preferredName);
    if (!owner || owner._id === openid) return preferredName;
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = randomName();
    const owner = await nameOwner(candidate);
    if (!owner || owner._id === openid) return candidate;
  }
  return isValidDisplayName(preferredName) ? preferredName : randomName();
}

exports.main = async (event) => {
  const payload = event || {};
  const { OPENID } = cloud.getWXContext();
  const now = db.serverDate();
  const players = db.collection('players');

  let player = null;
  try {
    player = (await players.doc(OPENID).get()).data;
  } catch {
    // 首次登录时文档不存在。
  }

  const forceName = payload.forceName === true;
  let displayName = player && player.displayName;

  if (forceName || !isValidDisplayName(displayName)) {
    displayName = await pickDisplayName(OPENID, payload.preferredName);

    if (player) {
      await players.doc(OPENID).update({
        data: { displayName, nameClaimed: true, nameUpdatedAt: now, lastLoginAt: now },
      });
    } else {
      await players.doc(OPENID).set({
        data: {
          displayName,
          nameClaimed: true,
          prosperity: 0,
          flags: {},
          createdAt: now,
          lastLoginAt: now,
        },
      });
    }
  } else {
    await players.doc(OPENID).update({ data: { lastLoginAt: now } });
  }

  return {
    openid: OPENID,
    isNew: !player,
    displayName,
  };
};
