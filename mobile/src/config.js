import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@flexsaas:server_url';

export async function getServerUrl() {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setServerUrl(url) {
  const clean = url.trim().replace(/\/$/, '');
  await AsyncStorage.setItem(KEY, clean);
}

export async function clearServerUrl() {
  await AsyncStorage.removeItem(KEY);
}
