# Biometric Security Testing

## Device checks
- [ ] Fingerprint hardware is detected
- [ ] Enrolled fingerprint is recognised
- [ ] Fingerprint toggle appears for signed-in users
- [ ] Fingerprint toggle is hidden in guest mode
- [ ] Cancelled verification leaves the setting disabled
- [ ] Sign-out clears the biometric preference

## Upcoming app-lock tests
- [ ] Returning within five minutes keeps the app unlocked
- [ ] Returning after five minutes requires authentication
- [ ] Restarting the app requires authentication
- [ ] Password fallback works
- [ ] Account switching does not reuse another user's preference

## Release checks
- [ ] TypeScript passes
- [ ] Android development build passes
- [ ] Biometric prompts work on a physical device
