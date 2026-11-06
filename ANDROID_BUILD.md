# Android APK Build

Shopping Items is built using React Native, Expo and TypeScript.

## Validate
npx tsc --noEmit

## Build APK
eas build -p android --profile preview

## Build for Google Play
eas build -p android --profile production

The preview profile creates an installable Android APK.
The production profile creates an Android App Bundle (AAB).
