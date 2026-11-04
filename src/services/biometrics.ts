
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const LEGACY_BIOMETRIC_KEY = 'shopping_items_biometrics_enabled';
const BIOMETRIC_PREFIX = 'shopping_items_biometrics_account_';

function getAccountKey(userId: string): string {
  if (!userId.trim()) {
    throw new Error('An Appwrite user ID is required.');
  }

  return `${BIOMETRIC_PREFIX}${userId}`;
}

export async function isBiometricAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  return hasHardware && isEnrolled;
}

export async function isBiometricEnabled(
  userId: string
): Promise<boolean> {
  const saved = await SecureStore.getItemAsync(
    getAccountKey(userId)
  );

  return saved === 'true';
}

export async function enableBiometricLogin(
  userId: string
): Promise<boolean> {
  if (!(await isBiometricAvailable())) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Enable fingerprint unlock',
    cancelLabel: 'Cancel',
    disableDeviceFallback: true,
  });

  if (!result.success) {
    return false;
  }

  await SecureStore.setItemAsync(
    getAccountKey(userId),
    'true'
  );

  return true;
}

export async function disableBiometricLogin(
  userId: string
): Promise<void> {
  await SecureStore.deleteItemAsync(getAccountKey(userId));
}

export async function clearLegacyBiometricPreference(): Promise<void> {
  await SecureStore.deleteItemAsync(LEGACY_BIOMETRIC_KEY);
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
