// MMKV is disabled in Expo Go. Use in-memory storage for now.
// const {createMMKV} = require('react-native-mmkv');
// export const storage = new createMMKV({id: 'auth-storage'});
const memoryStore = new Map();
export const storage = null;

export const setItem = (key, value) => {
	const serialized = JSON.stringify(value);
	memoryStore.set(key, serialized);
}

export const getItem = (key) => {
	const value = memoryStore.get(key);
	return value ? JSON.parse(value) : null;
}

export const removeItem = (key) => {
	memoryStore.delete(key);
}
