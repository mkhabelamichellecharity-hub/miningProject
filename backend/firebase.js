var admin = require("firebase-admin");

var serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://miningchell-default-rtdb.firebaseio.com"
});

const db = admin.database();

const getAll = async (path) => {
  const ref = db.ref(path);
  const snapshot = await ref.once('value');
  const data = snapshot.val();
  if (!data) return [];
  return Object.keys(data).map(key => ({ id: key, ...data[key] }));
};

const getDoc = async (path, id) => {
  const ref = db.ref(`${path}/${id}`);
  const snapshot = await ref.once('value');
  const data = snapshot.val();
  return data ? { id, ...data } : null;
};

const createDoc = async (path, data) => {
  const ref = db.ref(path).push();
  const now = new Date().toISOString();
  await ref.set({ ...data, createdAt: now, updatedAt: now });
  return { id: ref.key, ...data, createdAt: now, updatedAt: now };
};

const updateDoc = async (path, id, data) => {
  const ref = db.ref(`${path}/${id}`);
  const now = new Date().toISOString();
  await ref.update({ ...data, updatedAt: now });
  return getDoc(path, id);
};

const deleteDoc = async (path, id) => {
  const ref = db.ref(`${path}/${id}`);
  await ref.remove();
};

const queryOne = async (path, field, op, value) => {
  const all = await getAll(path);
  return all.find(item => {
    if (op === '==') return item[field] === value;
    if (op === '>') return item[field] > value;
    if (op === '<') return item[field] < value;
    // Add more operators as needed
    return false;
  }) || null;
};

const getSingleton = async (path) => {
  const items = await getAll(path);
  return items.length > 0 ? items[0] : null;
};

module.exports = {
  admin,
  db,
  getAll,
  getDoc,
  createDoc,
  updateDoc,
  deleteDoc,
  queryOne,
  getSingleton,
};
