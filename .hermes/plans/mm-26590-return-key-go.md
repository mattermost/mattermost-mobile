# Spec: Change "Join" to "Go" on Sign-in Page Keyboard (Issue #26590)

## Issue Summary
On iOS, the return/enter key on the on-screen keyboard shows "Join" when users are typing their password on the login screen. It should show "Go" instead.

## Root Cause
In `/home/ubuntu/dev/workspace/projects/mattermost-mobile/app/screens/login/form.tsx` at line 390, the password input has:
```tsx
returnKeyType='join'
```

The React Native `returnKeyType` prop accepts different values per platform. For iOS, 'join' displays "Join" on the keyboard, while 'go' displays "Go".

## Fix Scope
Single file change: `app/screens/login/form.tsx`
- Line 390: Change `returnKeyType='join'` to `returnKeyType='go'`

This affects only the password field on the login screen.

## Acceptance Criteria
- [ ] On iOS: Password field shows "Go" on keyboard return key
- [ ] On Android: Password field shows "Go" on keyboard return key (Android also supports 'go')
- [ ] No regression on other screens using returnKeyType
- [ ] Screenshots provided for both platforms

## Testing
- Manual test on iOS simulator and Android emulator
- Verify keyboard shows "Go" on password field
- Verify login functionality still works (pressing "Go" triggers login)