// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {adminEmail, adminPassword, adminUsername} from '@support/test_config';
import {v4 as uuidv4} from 'uuid';

export * from './email';
export * from './detoxhelpers';

/**
 * Explicit `wait` should not normally used but made available for special cases.
 * @param {number} ms - duration in millisecond
 * @return {Promise} promise with timeout
 */
export const wait = async (ms: number): Promise<any> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check if android.
 * @return {boolean} true if android
 */
export const isAndroid = (): boolean => {
    return device.getPlatform() === 'android';
};

/**
 * Check if ios.
 * @return {boolean} true if ios
 */
export const isIos = (): boolean => {
    return device.getPlatform() === 'ios';
};

/**
 * Check if running on iPad simulator.
 * @return {boolean} true if iPad
 */
export const isIpad = (): boolean => {
    return isIos() && device.name.toLowerCase().includes('ipad');
};

/**
 * Get random id.
 * @param {number} length - length on random string to return, e.g. 6 (default)
 * @return {string} random string
 */
export const getRandomId = (length = 6): string => {
    const MAX_SUBSTRING_INDEX = 27;

    return uuidv4().replace(/-/g, '').substring(MAX_SUBSTRING_INDEX - length, MAX_SUBSTRING_INDEX);
};

/**
 * Capitalize first character of text.
 * @param {string} text
 * @return {string} capitalized text
 */
export const capitalize = (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Get admin account.
 */
export const getAdminAccount = () => {
    return {
        username: adminUsername,
        password: adminPassword,
        email: adminEmail,
    };
};

const SECOND = 1000 * (process.env.LOW_BANDWIDTH_MODE === 'true' ? 5 : 1);
const MINUTE = 60 * 1000;

export const timeouts = {
    HALF_SEC: SECOND / 2,
    ONE_SEC: SECOND,
    TWO_SEC: SECOND * 2,
    THREE_SEC: SECOND * 3,
    FOUR_SEC: SECOND * 4,
    FIVE_SEC: SECOND * 5,
    TEN_SEC: SECOND * 10,
    TWENTY_SEC: SECOND * 20,
    HALF_MIN: MINUTE / 2,
    ONE_MIN: MINUTE,
    TWO_MIN: MINUTE * 2,
    FOUR_MIN: MINUTE * 4,
};

/**
 * Retry a function with reload
 * @param {function} func - function to retry
 * @param {number} retries - number of retries
 * @param {string} serverUrl - optional server URL to reconnect after reload
 * @param {string} serverDisplayName - optional server display name to reconnect after reload
 * @return {Promise<void>} - promise that resolves when the function succeeds
 * @throws {Error} - if the function fails after the specified number of retries
 */
export async function retryWithReload(
    func: () => Promise<void>,
    retries: number = 2,
    ServerScreen: any,
    serverUrl?: string,
    serverDisplayName?: string,
): Promise<void> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await func();
            return;
        } catch (err) {
            if (attempt < retries) {
                // eslint-disable-next-line no-await-in-loop
                await device.reloadReactNative();
                // eslint-disable-next-line no-await-in-loop
                await new Promise((res) => setTimeout(res, 10000));

                // If server connection details provided, reconnect after reload
                if (serverUrl && serverDisplayName) {
                    // Dynamically import to avoid circular dependencies
                    // eslint-disable-next-line no-await-in-loop
                    await ServerScreen.connectToServer(serverUrl, serverDisplayName);
                }
            } else {
                throw err;
            }
        }
    }
}

/**
 * Long-press an element with automatic retry, re-scrolling the list between attempts.
 *
 * After posting a message the keyboard dismiss animation temporarily blocks React Native's
 * gesture responder system. A plain longPress can fire without effect during this window
 * even after a fixed wait. This helper retries the gesture (with a fresh scroll to settle
 * the UI) so tests are self-healing regardless of animation timing.
 *
 * On iOS 26.2 the gesture responder system takes longer to become available after keyboard
 * dismiss animations complete. Use FIVE_SEC wait and press duration to ensure the gesture
 * lands correctly. On Android a shorter wait (TWO_SEC) and press (THREE_SEC) is sufficient
 * because Android gesture handling is more deterministic and reduces total elapsed time.
 *
 * Per-attempt budget:
 *   iOS:     5s wait + 5s press + 10s check = 20s × 5 attempts = 100s max
 *   Android: 2s wait + 3s press + 10s check = 15s × 5 attempts = 75s max
 *
 * Using HALF_MIN (30s) for the check risked blowing the 240s Jest per-test limit when a
 * test calls openPostOptionsFor twice (e.g. MM-T4786_1 edit then delete). TEN_SEC is
 * still generous — if the long-press lands the options sheet opens within ~1s.
 *
 * @param target - The element to long-press
 * @param scrollTarget - A scrollable list to scroll before each attempt (dismisses keyboard + settles UI)
 * @param checkElement - An element that should exist once the long-press succeeds (e.g. PostOptionsScreen)
 * @param maxAttempts - How many times to retry before throwing (default: 5)
 */
export async function longPressWithScrollRetry(
    target: Detox.NativeElement,
    scrollTarget: Detox.NativeElement,
    checkElement: Detox.NativeElement,
    maxAttempts = 5,
): Promise<void> {
    /* eslint-disable no-await-in-loop */
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Dismiss keyboard and settle the UI before long-pressing.
        //
        // On Android, the post list uses keyboardDismissMode='on-drag' which only
        // triggers on real touch gestures, NOT on programmatic scroll. Detox's
        // scroll() API can use programmatic scrolling that bypasses on-drag, so the
        // keyboard stays open even after a successful scroll(). Use swipe() first
        // (a real gesture) to reliably dismiss the keyboard, then scroll to settle.
        //
        // On iOS, a small scroll is sufficient to re-register the gesture responder
        // and dismiss the keyboard via the interactive dismiss mode.
        if (isAndroid()) {
            try {
                await scrollTarget.swipe('down', 'slow', 0.2);
            } catch { /* ignore — list may be too short or already at edge */ }
            try {
                await scrollTarget.scroll(100, 'down', 0.5, 0.5);
            } catch { /* ignore — list may be at the bottom boundary */ }
        } else {
            // On iOS 26 iPhone 17 Pro the dynamic island covers roughly the top 60pt.
            // A fresh post can render with its centre point under the island and fail
            // Detox's hittability probe (view_point {201,30} — visibility percent 100).
            // Swipe DOWN (finger moves top→bottom) so the post moves DOWN out from under
            // the island. Use swipe (real gesture) — scroll() can use a programmatic
            // offset that doesn't actually reposition in the layout for hittability.
            try {
                await scrollTarget.swipe('down', 'slow', 0.25);
            } catch { /* ignore — list may already be at top */ }
        }

        // Increase Android wait/press durations: API 35 CI emulators need more time
        // for the gesture responder to become available after keyboard dismiss animations.
        const waitDuration = isAndroid() ? timeouts.THREE_SEC : timeouts.FIVE_SEC;
        const pressDuration = isAndroid() ? timeouts.FOUR_SEC : timeouts.FIVE_SEC;
        await wait(waitDuration);

        // On iOS 26.x the gesture-recognizer hittability check can fail even when
        // the target is visually on-screen (a residual UITransitionView / dim
        // overlay from the previous screen transition keeps reporting a non-100%
        // visibility percent). Disable synchronization around the gesture so the
        // longPress dispatches regardless of Detox's hittability probe, then
        // re-enable so subsequent matchers run normally.
        if (isIos()) {
            await device.disableSynchronization();
        }
        try {
            await target.longPress(pressDuration);
        } finally {
            if (isIos()) {
                await device.enableSynchronization();
            }
        }
        try {
            // Use polling waitForElementToExist instead of waitFor().toExist() to avoid
            // bridge-idle synchronization blocking on Android API 35 CI emulators.
            // waitFor().toExist() uses Espresso's IdlingResource sync and blocks until
            // the JS bridge (mqt_js) is idle — which can take much longer than TEN_SEC
            // when the post options sheet animation keeps the bridge busy after a gesture.
            await waitForElementToExist(checkElement, timeouts.TEN_SEC);
            return;
        } catch {
            if (attempt === maxAttempts) {
                throw new Error(`Element did not appear after ${maxAttempts} longPress attempts`);
            }
        }
    }
    /* eslint-enable no-await-in-loop */
}

/**
 * Long-press an element with automatic retry (no scroll).
 *
 * Similar to `longPressWithScrollRetry` but for screens where scrolling is
 * unnecessary or the list reference is unavailable.  Between attempts the helper
 * simply waits a moment and retries with a longer press duration on Android,
 * where the gesture responder can be unresponsive during animations.
 *
 * @param target        - The element to long-press
 * @param checkElement  - An element that should exist once the long-press succeeds (e.g. PostOptionsScreen)
 * @param maxAttempts   - How many times to retry before throwing (default: 5)
 */
export async function longPressWithRetry(
    target: Detox.NativeElement,
    checkElement: Detox.NativeElement,
    maxAttempts = 5,
): Promise<void> {
    /* eslint-disable no-await-in-loop */
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Use a longer press duration on Android where gestures are less reliable.
        const pressDuration = isAndroid() ? timeouts.FOUR_SEC : timeouts.TWO_SEC;
        await target.longPress(pressDuration);
        try {
            // Use polling waitForElementToExist instead of waitFor().toExist() to avoid
            // bridge-idle synchronization blocking on Android API 35 CI emulators.
            await waitForElementToExist(checkElement, timeouts.TEN_SEC);
            return;
        } catch {
            if (attempt === maxAttempts) {
                throw new Error(`Element did not appear after ${maxAttempts} longPress attempts`);
            }

            // Brief pause before retrying
            await wait(timeouts.THREE_SEC);
        }
    }
    /* eslint-enable no-await-in-loop */
}

/**
 * Poll for an element to become visible without waiting for React Native bridge to be idle.
 * This is useful when the bridge is busy with animations or state updates but the UI is already rendered.
 *
 * @param {Detox.NativeElement} detoxElement - The Detox element to wait for
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 10 seconds)
 * @param {number} pollInterval - How often to check in milliseconds (default: 500ms)
 * @return {Promise<void>} - Resolves when element is visible, throws if timeout is reached
 * @throws {Error} - If element is not visible after timeout
 *
 * @example
 * const button = element(by.id('my.button'));
 * await waitForElementToBeVisible(button, timeouts.TEN_SEC);
 */
export async function waitForElementToBeVisible(
    detoxElement: Detox.NativeElement,
    timeout: number = isAndroid() ? timeouts.TWENTY_SEC : timeouts.TEN_SEC,
    pollInterval: number = timeouts.HALF_SEC,
): Promise<void> {
    const {expect: detoxExpect} = require('detox');
    const startTime = Date.now();
    /* eslint-disable no-await-in-loop */
    while (Date.now() - startTime < timeout) {
        try {
            await detoxExpect(detoxElement).toBeVisible();
            return; // Element found and visible
        } catch (error) {
            // Element not visible yet, wait and try again
            if ((Date.now() - startTime) + pollInterval >= timeout) {
                // About to timeout, throw the error
                throw error;
            }
            await wait(pollInterval);
        }
    }
    /* eslint-enable no-await-in-loop */
    // Final check - will throw if still not found
    await detoxExpect(detoxElement).toBeVisible();
}

/**
 * Poll for element non-existence without Detox bridge-idle synchronization.
 *
 * On Android, waitFor().not.toExist().withTimeout() blocks until bridge-idle
 * before evaluating. After pressBack() or dismiss animations the bridge stays
 * busy, so the 10-second timeout can expire before the check even runs and the
 * catch block silently swallows the error. This helper polls expect().not.toExist()
 * directly, giving the element a chance to disappear across multiple poll intervals.
 *
 * @param {Detox.NativeElement} detoxElement - The Detox element to wait for disappearance
 * @param {number} timeout - Maximum time to wait in milliseconds (default: HALF_MIN)
 * @param {number} pollInterval - How often to check in milliseconds (default: 500ms)
 *
 * @example
 * await waitForElementToNotExist(tutorialOverlay, timeouts.TEN_SEC);
 */
export async function waitForElementToNotExist(
    detoxElement: Detox.NativeElement,
    timeout: number = timeouts.HALF_MIN,
    pollInterval: number = timeouts.HALF_SEC,
): Promise<void> {
    const {expect: detoxExpect} = require('detox');
    const startTime = Date.now();
    /* eslint-disable no-await-in-loop */
    while (Date.now() - startTime < timeout) {
        try {
            await detoxExpect(detoxElement).not.toExist();
            return; // Element no longer exists
        } catch (error) {
            if ((Date.now() - startTime) + pollInterval >= timeout) {
                throw new Error(
                    `waitForElementToNotExist: element still present after ${timeout}ms. Original: ${(error as Error)?.message ?? String(error)}`,
                );
            }
            await wait(pollInterval);
        }
    }
    /* eslint-enable no-await-in-loop */
    // Final check - will throw if still exists
    try {
        await detoxExpect(detoxElement).not.toExist();
    } catch (error) {
        throw new Error(
            `waitForElementToNotExist: element still present after ${timeout}ms. Original: ${(error as Error)?.message ?? String(error)}`,
        );
    }
}

/**
 * Poll for element existence without Detox bridge-idle synchronization.
 *
 * On Android the JS bridge (mqt_js) is often busy during animations and
 * bottom-sheet open/close transitions. waitFor().toExist().withTimeout()
 * uses bridge-idle sync and blocks until the bridge is idle before
 * evaluating, which can take much longer than the timeout on CI emulators.
 * This helper bypasses that by polling expect().toExist() directly.
 *
 * Use this instead of waitFor().toExist().withTimeout() when the element
 * may be present behind an overlay (like a tutorial), where toBeVisible()
 * would also fail due to the 50% visibility threshold.
 *
 * @param {Detox.NativeElement} detoxElement - The Detox element to wait for
 * @param {number} timeout - Maximum time to wait in milliseconds (default: HALF_MIN)
 * @param {number} pollInterval - How often to check in milliseconds (default: 500ms)
 *
 * @example
 * await waitForElementToExist(serverListScreen, timeouts.HALF_MIN);
 */
export async function waitForElementToExist(
    detoxElement: Detox.NativeElement,
    timeout: number = timeouts.HALF_MIN,
    pollInterval: number = timeouts.HALF_SEC,
): Promise<void> {
    const {expect: detoxExpect} = require('detox');
    const startTime = Date.now();
    /* eslint-disable no-await-in-loop */
    while (Date.now() - startTime < timeout) {
        try {
            await detoxExpect(detoxElement).toExist();
            return; // Element exists in hierarchy
        } catch (error) {
            if ((Date.now() - startTime) + pollInterval >= timeout) {
                throw error;
            }
            await wait(pollInterval);
        }
    }
    /* eslint-enable no-await-in-loop */
    // Final check - will throw if still not found
    await detoxExpect(detoxElement).toExist();
}
