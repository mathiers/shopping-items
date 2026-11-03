
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_KEY = 'shopping_items_biometrics_enabled';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  return hasHardware && isEnrolled;
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === 'true';
}

export async function enableBiometricLogin(): Promise<boolean> {
  if (!(await isBiometricAvailable())) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Enable fingerprint unlock',
    cancelLabel: 'Cancel',
    disableDeviceFallback: true,
  });

  if (!result.success) return false;

  await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
  return true;
}

export async function disableBiometricLogin(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  if (!(await isBiometricAvailable())) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Shopping Items',
    cancelLabel: 'Cancel',
    disableDeviceFallback: true,
  });

  return result.success;
}
