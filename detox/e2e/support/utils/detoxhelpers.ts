// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {by, element, waitFor} from 'detox';

export async function waitForPartialText(text: string, timeout = 10000): Promise<void> {
    // Detox does not support partial text matching directly; use exact match or implement a workaround.
    await waitFor(element(by.text(new RegExp(text, 'i')))).toBeVisible().withTimeout(timeout);
}

export async function expectPartialText(text: string, timeout = 10000): Promise<void> {
    // Detox does not support partial text matching directly; use exact match or implement a workaround.
    await waitFor(element(by.text(new RegExp(text, 'i')))).toBeVisible().withTimeout(timeout);
}

export async function scrollUntilVisible(testID: string, text: string): Promise<void> {
    // Detox does not support partial text matching directly; use exact match or implement a workaround.
    await waitFor(element(by.text(new RegExp(text, 'i')))).
        toBeVisible().
        whileElement(by.id(testID)).
        scroll(100, 'down');
}

export async function waitForLoadingSpinner(testID: string, timeout = 10000): Promise<void> {
    await waitFor(element(by.id(testID))).not.toBeVisible().withTimeout(timeout);
}

/**
 * Tap the native stack header's back button on screens that use the expo-router /
 * `@react-navigation/native-stack` native header (Thread, ThemeDisplaySettings,
 * PinnedMessages, Table, etc.).
 *
 * History: before the RNN→expo-router migration (commit b6fc85385), the app set
 * `topBar.backButton.testID = 'screen.back.button'` on RNN's native top bar, so
 * Detox could find it by id. After the migration, the native-stack header in
 * `@react-navigation/native-stack` v7 / `react-native-screens` v4.24 exposes NO
 * testID API for the back chevron. The custom `<NavigationHeader>` testID
 * `navigation.header.back` only exists on screens that render that component
 * (e.g. ChannelScreen). On native-stack screens it doesn't exist at all, which
 * was the root cause of ~33 Detox failures referencing the back chevron.
 *
 * Cross-platform approach without touching production:
 *   - Android: tap the AppCompat Toolbar's navigation icon by its default
 *     accessibility content description "Navigate up". We do NOT use
 *     `device.pressBack()` here because some screens
 *     (e.g. notification_settings family — verified locally on
 *     detox_pixel_8_api_35) register `useAndroidHardwareBackHandler` to
 *     handle save-on-back, which swallows the hardware back press without
 *     popping the screen. Tapping the chevron exercises the same code path
 *     a real user takes.
 *   - iOS: the iOS native stack chevron exposes `accessibilityLabel = "Back"`
 *     even with `headerBackButtonDisplayMode: 'minimal'`. Tap it by label.
 */
export async function tapNativeBackButton(timeout = 10_000): Promise<void> {
    const label = device.getPlatform() === 'ios' ? 'Back' : 'Navigate up';
    const backButton = element(by.label(label)).atIndex(0);
    await waitFor(backButton).toBeVisible().withTimeout(timeout);
    await backButton.tap();
}

/**
 * Retry an element visibility check with linear backoff
 * Helps handle race conditions during navigation and UI transitions
 * @param elementToCheck - Detox element to check visibility
 * @param timeout - Timeout for each attempt in milliseconds
 * @param maxAttempts - Maximum number of retry attempts
 */
export async function waitForVisibilityWithRetry(
    elementToCheck: Detox.NativeElement,
    timeout?: number,
    maxAttempts = 3,
): Promise<void> {
    const effectiveTimeout = timeout ?? (device.getPlatform() === 'android' ? 20000 : 10000);

    /* eslint-disable no-await-in-loop, no-console */
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await waitFor(elementToCheck).toBeVisible().withTimeout(effectiveTimeout);
            return;
        } catch (error) {
            if (attempt === maxAttempts) {
                throw error;
            }

            console.warn(`[waitForVisibilityWithRetry] Attempt ${attempt}/${maxAttempts} failed, retrying...`);

            // Linear backoff: 1s, 2s, 3s
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
    }
    /* eslint-enable no-await-in-loop, no-console */
}
