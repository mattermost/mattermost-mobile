// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {adminEmail, adminPassword, adminUsername} from '@support/test_config';
import {by, element, waitFor} from 'detox';
import {v4 as uuidv4} from 'uuid';

export * from './email';
export * from './detoxhelpers';

export const wait = async (ms: number): Promise<any> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const isAndroid = (): boolean => {
    return device.getPlatform() === 'android';
};

export const isIos = (): boolean => {
    return device.getPlatform() === 'ios';
};

export const isIpad = (): boolean => {
    return isIos() && device.name.toLowerCase().includes('ipad');
};

export const getRandomId = (length = 6): string => {
    const MAX_SUBSTRING_INDEX = 27;

    return uuidv4().replace(/-/g, '').substring(MAX_SUBSTRING_INDEX - length, MAX_SUBSTRING_INDEX);
};

export const capitalize = (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1);
};

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
 * Poll until a Detox system-dialog element exists (or deadline).
 * `waitFor` does not apply to `system.element(...)`.
 */
const waitForSystemElement = async (
    systemElement: {tap: () => Promise<void>},
    timeout: number,
): Promise<void> => {
    const {expect: detoxExpect} = require('detox');
    const deadline = Date.now() + timeout;
    /* eslint-disable no-await-in-loop */
    while (Date.now() < deadline) {
        try {
            await detoxExpect(systemElement).toExist();
            return;
        } catch {
            await wait(timeouts.HALF_SEC);
        }
    }
    /* eslint-enable no-await-in-loop */
    await detoxExpect(systemElement).toExist();
};

/**
 * Dismiss the iOS "Save Password?" sheet if present.
 *
 * On iOS 18+/26.x SharedWebCredentialViewService shows this sheet after login.
 * MDM `allowPasswordAutoFill=NO` only disables the keyboard toolbar — it does not
 * stop the sheet.
 *
 * Passwords.app is a *system* dialog: app-level `element(by.text/label)` cannot
 * see it. Use Detox System APIs (`system.element(by.system.label(...))`).
 *
 * Optionally background/foreground only when the system title is confirmed
 * (never when the dialog is absent — that previously broke channel-list loading).
 *
 * No-op on Android.
 */
export const dismissIosSavePasswordIfVisible = async (
    probeTimeout = timeouts.FIVE_SEC,
    options: {allowBackgroundFallback?: boolean} = {},
): Promise<boolean> => {
    if (isAndroid()) {
        return false;
    }

    const {allowBackgroundFallback = false} = options;

    // Primary: Detox System API (XCUITest) — required for Passwords.app.
    try {
        const notNow = system.element(by.system.label('Not Now'));
        await waitForSystemElement(notNow, probeTimeout);
        await notNow.tap();
        await wait(timeouts.HALF_SEC);
        return true;
    } catch {
        // Fall through.
    }

    // Legacy app-hierarchy probes (rarely work for this sheet; cheap).
    try {
        const notNow = element(by.text('Not Now'));
        await waitFor(notNow).toBeVisible().withTimeout(timeouts.HALF_SEC);
        await notNow.tap();
        await wait(timeouts.HALF_SEC);
        return true;
    } catch {
        // Fall through.
    }

    if (!allowBackgroundFallback) {
        return false;
    }

    // Confirm via system title before sendToHome.
    try {
        await waitForSystemElement(system.element(by.system.label('Save Password?')), timeouts.TWO_SEC);
    } catch {
        return false;
    }

    await device.sendToHome();
    await wait(timeouts.HALF_SEC);
    await device.launchApp({newInstance: false});
    await wait(timeouts.ONE_SEC);
    return true;
};

/**
 * After sign-in, wait for the channel list while dismissing a delayed
 * "Save Password?" sheet that can cover the app before/while the list loads.
 */
export const waitForChannelListAfterLogin = async (
    channelListScreen: Detox.NativeElement,
    overallTimeout = isAndroid() ? timeouts.ONE_MIN : timeouts.HALF_MIN,
): Promise<void> => {
    const deadline = Date.now() + overallTimeout;
    /* eslint-disable no-await-in-loop */
    while (Date.now() < deadline) {
        if (isIos()) {
            await dismissIosSavePasswordIfVisible(timeouts.TWO_SEC, {allowBackgroundFallback: true});
        }
        try {
            await waitFor(channelListScreen).toExist().withTimeout(timeouts.TWO_SEC);
            // Sheet often appears after the list is already in the hierarchy.
            if (isIos()) {
                await wait(timeouts.ONE_SEC);
                await dismissIosSavePasswordIfVisible(timeouts.FIVE_SEC, {allowBackgroundFallback: true});
            }
            return;
        } catch {
            // Keep polling until deadline.
        }
    }
    /* eslint-enable no-await-in-loop */
    await waitFor(channelListScreen).toExist().withTimeout(timeouts.ONE_SEC);
    if (isIos()) {
        await dismissIosSavePasswordIfVisible(timeouts.FIVE_SEC, {allowBackgroundFallback: true});
    }
};

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

                if (serverUrl && serverDisplayName) {
                    // A prior suite may have left the session authenticated, so log out before connectToServer
                    // can show the server form again. Lazy require avoids a utils <-> screen circular import.
                    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
                    const {ChannelListScreen, HomeScreen} = require('@support/ui/screen');
                    try {
                        // eslint-disable-next-line no-await-in-loop
                        await waitFor(ChannelListScreen.channelListScreen).toExist().withTimeout(timeouts.THREE_SEC);
                        // eslint-disable-next-line no-await-in-loop
                        await HomeScreen.logout();
                        // eslint-disable-next-line no-await-in-loop
                        await wait(timeouts.TWO_SEC);
                    } catch {
                        // Not on channel list — proceed to connect.
                    }
                    // eslint-disable-next-line no-await-in-loop
                    await ServerScreen.connectToServer(serverUrl, serverDisplayName);
                }
            } else {
                throw err;
            }
        }
    }
}

// Scroll a post row into the visible viewport before long-press (iOS header/draft clip).
export async function scrollElementIntoView(
    target: Detox.NativeElement,
    scrollContainer: Detox.NativeMatcher,
    maxScrolls = 15,
): Promise<void> {
    const visibilityThreshold = isIos() ? 50 : 25;
    /* eslint-disable no-await-in-loop */
    for (let i = 0; i < maxScrolls; i++) {
        try {
            await waitFor(target).toBeVisible(visibilityThreshold).withTimeout(timeouts.TWO_SEC);
            return;
        } catch {
            if (isIos()) {
                await device.disableSynchronization();
            }
            try {
                for (const direction of ['down', 'up'] as const) {
                    try {
                        await waitFor(target).
                            toBeVisible(visibilityThreshold).
                            whileElement(scrollContainer).
                            scroll(250, direction);
                        return;
                    } catch { /* try opposite direction */ }
                }
            } finally {
                if (isIos()) {
                    await safeEnableSynchronization();
                }
            }
        }
    }
    /* eslint-enable no-await-in-loop */
    await waitForElementToBeVisible(target, timeouts.FIVE_SEC, timeouts.HALF_SEC, visibilityThreshold);
}

const isIosHittableError = (error: unknown) => {
    const msg = String(error);
    return msg.includes('hittable') || msg.includes('visibility percent');
};

// Long-press with scroll/swipe retry for flaky post-option gestures after keyboard dismiss.
export async function longPressWithScrollRetry(
    target: Detox.NativeElement,
    scrollContainer: Detox.NativeMatcher,
    checkElement: Detox.NativeElement,
    maxAttempts = 8,
    deadlineMs?: number,
): Promise<void> {
    /* eslint-disable no-await-in-loop */
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (deadlineMs !== undefined && Date.now() > deadlineMs) {
            throw new Error(`longPressWithScrollRetry exceeded deadline after ${attempt - 1} attempts`);
        }
        await scrollElementIntoView(target, scrollContainer);

        if (isAndroid()) {
            try {
                await element(scrollContainer).swipe('down', 'slow', 0.2);
            } catch { /* ignore */ }
            try {
                await element(scrollContainer).scroll(100, 'down', 0.5, 0.5);
            } catch { /* ignore */ }
        }

        const waitDuration = isAndroid() ? timeouts.TWO_SEC : timeouts.THREE_SEC;
        const pressDuration = isAndroid() ? timeouts.FOUR_SEC : timeouts.FIVE_SEC;
        await wait(waitDuration);

        if (isIos()) {
            await device.disableSynchronization();
        }
        let longPressFailed = false;
        try {
            await target.longPress(pressDuration);
        } catch (pressError) {
            if (isIos() && attempt < maxAttempts && isIosHittableError(pressError)) {
                longPressFailed = true;
            } else {
                throw pressError;
            }
        } finally {
            if (isIos()) {
                await safeEnableSynchronization();
            }
        }
        if (longPressFailed) {
            continue;
        }
        try {
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

// Long-press retry; pass scrollContainer to scroll the post into view first.
export async function longPressWithRetry(
    target: Detox.NativeElement,
    checkElement: Detox.NativeElement,
    maxAttempts = 5,
    scrollContainer?: Detox.NativeMatcher,
): Promise<void> {
    /* eslint-disable no-await-in-loop */
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (scrollContainer) {
            await scrollElementIntoView(target, scrollContainer);
            if (isAndroid()) {
                try {
                    await element(scrollContainer).swipe('down', 'slow', 0.2);
                } catch { /* ignore */ }
            }
            await wait(isAndroid() ? timeouts.TWO_SEC : timeouts.ONE_SEC);
        }

        const pressDuration = isAndroid() ? timeouts.FOUR_SEC : timeouts.TWO_SEC;

        if (isAndroid()) {
            await device.disableSynchronization();
        }
        try {
            try {
                await target.longPress(pressDuration);
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                await wait(timeouts.THREE_SEC);
                continue;
            }
        } finally {
            if (isAndroid()) {
                await safeEnableSynchronization();
            }
        }
        try {
            await waitForElementToExist(checkElement, timeouts.TEN_SEC);
            return;
        } catch {
            if (attempt === maxAttempts) {
                throw new Error(`Element did not appear after ${maxAttempts} longPress attempts`);
            }

            await wait(timeouts.THREE_SEC);
        }
    }
    /* eslint-enable no-await-in-loop */
}

// Poll for visibility without waiting for the RN bridge to idle.
export async function waitForElementToBeVisible(
    detoxElement: Detox.NativeElement,
    timeout: number = isAndroid() ? timeouts.TWENTY_SEC : timeouts.TEN_SEC,
    pollInterval: number = timeouts.HALF_SEC,
    visibilityThreshold = isAndroid() ? 15 : 75,
): Promise<void> {
    const {expect: detoxExpect} = require('detox');
    const startTime = Date.now();
    /* eslint-disable no-await-in-loop */
    while (Date.now() - startTime < timeout) {
        try {
            await detoxExpect(detoxElement).toBeVisible(visibilityThreshold);
            return;
        } catch (error) {
            if ((Date.now() - startTime) + pollInterval >= timeout) {
                throw error;
            }
            await wait(pollInterval);
        }
    }
    /* eslint-enable no-await-in-loop */
    await detoxExpect(detoxElement).toBeVisible(visibilityThreshold);
}

// Poll for non-existence without Detox bridge-idle synchronization.
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
            return;
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
    try {
        await detoxExpect(detoxElement).not.toExist();
    } catch (error) {
        throw new Error(
            `waitForElementToNotExist: element still present after ${timeout}ms. Original: ${(error as Error)?.message ?? String(error)}`,
        );
    }
}

// Poll for existence without Detox bridge-idle synchronization.
// Hierarchy existence check on all platforms so callers probing off-screen items before
// scrolling do not time out. For visibility, use waitForElementToBeVisible instead.
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
            return;
        } catch (error) {
            if ((Date.now() - startTime) + pollInterval >= timeout) {
                throw error;
            }
            await wait(pollInterval);
        }
    }
    /* eslint-enable no-await-in-loop */
    await detoxExpect(detoxElement).toExist();
}

// Retry enableSynchronization after Android Fabric ReactContext null races.
export async function safeEnableSynchronization(): Promise<void> {
    const delays = [timeouts.HALF_SEC, timeouts.ONE_SEC, timeouts.TWO_SEC];
    /* eslint-disable no-await-in-loop */
    for (let i = 0; i <= delays.length; i++) {
        try {
            await device.enableSynchronization();
            return;
        } catch (error) {
            const message = (error as Error)?.message ?? String(error);
            if (!message.includes('ReactContext is null')) {
                throw error;
            }
            if (i === delays.length) {
                throw error;
            }
            await wait(delays[i]!);
        }
    }
    /* eslint-enable no-await-in-loop */
}

// Platform back: Android uses hardware back; iOS taps the native-stack chevron.
export async function pressBack(): Promise<void> {
    if (isAndroid()) {
        await device.pressBack();
    } else {
        await wait(timeouts.TWO_SEC);
        await element(by.id('navigation.header.back')).tap();
    }
}

// Poll visibility then assert with the same platform threshold as waitForElementToBeVisible;
// Detox's default 75% flakes on Android edge-to-edge even after a successful poll.
export async function expectVisible(
    detoxElement: Detox.NativeElement,
    timeout: number = isAndroid() ? timeouts.TWENTY_SEC : timeouts.TEN_SEC,
    visibilityThreshold = isAndroid() ? 15 : 75,
): Promise<void> {
    await waitForElementToBeVisible(detoxElement, timeout, timeouts.HALF_SEC, visibilityThreshold);
    const {expect: detoxExpect} = require('detox');
    await detoxExpect(detoxElement).toBeVisible(visibilityThreshold);
}
