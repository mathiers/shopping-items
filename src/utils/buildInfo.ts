import { Platform } from 'react-native';

export function getPlatformName(): string {
  switch (Platform.OS) {
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    case 'web':
      return 'Web';
    default:
      return 'Unknown';
  }
}

export function getBuildInfo(): string {
  return `Platform: ${getPlatformName()}`;
}
