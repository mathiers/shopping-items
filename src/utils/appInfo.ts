import Constants from 'expo-constants';

export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? 'Unknown';
}

export function getAppName(): string {
  return Constants.expoConfig?.name ?? 'Shopping Items';
}

export function getAppInfo(): string {
  return `${getAppName()} v${getAppVersion()}`;
}
