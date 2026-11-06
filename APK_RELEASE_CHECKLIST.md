# Shopping Items - APK Release Checklist

## Before building
- [ ] TypeScript validation passes
- [ ] Appwrite authentication works
- [ ] Shopping items persist after restart
- [ ] Budget calculations are correct
- [ ] Dark mode works
- [ ] Shopping history works
- [ ] Splash screen and app icon are verified

## Build
Run:
eas build -p android --profile preview

## After installation
- [ ] App launches successfully
- [ ] Login and logout work
- [ ] Items can be added and edited
- [ ] Purchased items update totals
- [ ] Data survives app restart
