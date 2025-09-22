import { openDB } from 'idb';

export const initDB = async () => {
  return openDB('DisasterMessengerDB', 1, {
    upgrade(db) {
      db.createObjectStore('messages', { keyPath: 'id' });
      db.createObjectStore('peers', { keyPath: 'id' });
      db.createObjectStore('offlineQueue', { keyPath: 'id' });
      db.createObjectStore('activePeer', { keyPath: 'id' });
      db.createObjectStore('myName', { keyPath: 'id' });
    },
  });
};

// Generic functions
export const saveItem = async (store, data) => {
  const db = await initDB();
  return db.put(store, data);
};

export const getItem = async (store, id) => {
  const db = await initDB();
  return db.get(store, id);
};

export const getAll = async (store) => {
  const db = await initDB();
  return db.getAll(store);
};

export const deleteItem = async (store, id) => {
  const db = await initDB();
  return db.delete(store, id);
};
