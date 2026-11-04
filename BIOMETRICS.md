# Biometric Authentication

Shopping Items uses Expo Local Authentication and Secure Store.

## Implemented

- Detects biometric hardware and enrolled credentials.
- Requires biometric verification before enabling the setting.
- Stores the biometric preference in Secure Store.
- Allows signed-in users to disable biometric unlock.
- Hides biometric settings in Guest Mode.
- Clears the biometric preference on sign-out.

## Planned

- Lock the app when returning after five minutes in the background.
- Require biometric verification on cold startup.
- Provide secure password fallback.
- Associate biometric preferences with the correct Appwrite account.

## Security

- Fingerprint data is handled by Android.
- The app does not store fingerprint images or templates.
- Biometric verification does not replace Appwrite authentication.
- The current toggle does not yet enforce an app lock.
