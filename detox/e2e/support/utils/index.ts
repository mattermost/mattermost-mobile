// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {adminEmail, adminPassword, adminUsername} from '@support/test_config';
import {waitFor} from 'detox';
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

let syncDisableDepth = 0;

/**
 * How long to wait for Detox to confirm the app is idle when turning synchronization back
 * on. Detox resolves enableSynchronization() only once the app reports idle, and it polls
 * for that forever.
 *
 * After ChannelScreen.back() the app can stay busy indefinitely. Measured on the iOS run
 * for 0af8631 (detox.log): the back tap itself completed in 4.0s with synchronization
 * already disabled, then enableSynchronization() polled `app_status: "busy"` every 20s --
 * 237.6s in MM-T585_1 and 294.4s in MM-T5294_12, consuming both tests' entire budgets and
 * timing them out. The busy resources never cleared:
 *   one_time_events {event: "Runloop Perform Block", object: "JS Run Loop"}
 *   run_loop        {name: "JS Run Loop"} / {name: "Main Run Loop"}
 *   dispatch_queue  Main Queue, works_count 1-2
 *
 * Detox dispatches setSyncSettings{enabled: true} before that idle wait begins, so
 * synchronization is already back on app-side by the time we stop waiting; only the idle
 * confirmation is outstanding. Giving up on that confirmation therefore restores the
 * setting either way, and every caller still has its own explicit waits.
 */
const ENABLE_SYNC_IDLE_BUDGET_MS = 30 * SECOND;

/**
 * device.enableSynchronization(), bounded. Resolves 'timeout' instead of hanging when the
 * app never reports idle. A late rejection is kept handled so racing past it cannot surface
 * as an unhandled rejection after the caller has moved on.
 */
async function enableSynchronizationBounded(): Promise<'enabled' | 'timeout'> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const guard = new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), ENABLE_SYNC_IDLE_BUDGET_MS);
    });

    const enabled = device.enableSynchronization().then(() => 'enabled' as const);
    enabled.catch(() => {
        // Handled here so a rejection arriving after the guard won cannot go unhandled;
        // the race below still sees it when it arrives first.
    });

    try {
        return await Promise.race([enabled, guard]);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}

export async function safeEnableSynchronization(): Promise<void> {
    if (syncDisableDepth > 0) {
        return;
    }

    const delays = [timeouts.HALF_SEC, timeouts.ONE_SEC, timeouts.TWO_SEC];
    let relaunched = false;
    /* eslint-disable no-await-in-loop */
    for (let i = 0; i <= delays.length; i++) {
        try {
            if (await enableSynchronizationBounded() === 'timeout') {
                // eslint-disable-next-line no-console
                console.warn(`[safeEnableSynchronization] app still busy after ${ENABLE_SYNC_IDLE_BUDGET_MS}ms; synchronization is on, continuing without the idle confirmation`);
            }
            return;
        } catch (error) {
            const message = (error as Error)?.message ?? String(error);
            if (!message.includes('ReactContext is null')) {
                throw error;
            }
            if (i === delays.length) {
                if (relaunched) {
                    throw error;
                }
                relaunched = true;

                // Instance destroyed, not starting: relaunch so the worker's later tests
                // run against a live app instead of a dead one Detox keeps reusing. One
                // relaunch, then the remaining retries give the fresh instance its own
                // bounded window; if it still fails, surface the error.
                i = -1;
                // eslint-disable-next-line no-await-in-loop -- recovery launch, not a poll
                await device.launchApp({newInstance: true, launchArgs: {detoxEnableSynchronization: 0}});
                continue;
            }
            await wait(delays[i] ?? delays[delays.length - 1] ?? timeouts.ONE_SEC);
        }
    }
    /* eslint-enable no-await-in-loop */
}

export async function withSynchronizationDisabled<T>(fn: () => Promise<T>): Promise<T> {
    if (syncDisableDepth === 0) {
        await device.disableSynchronization();
    }
    syncDisableDepth += 1;
    try {
        return await fn();
    } finally {
        syncDisableDepth -= 1;
        if (syncDisableDepth === 0) {
            await safeEnableSynchronization();
        }
    }
}

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
    const visibilityThreshold = isIos() ? 40 : 25;
    const {expect: detoxExpect} = require('detox');

    if (isIos()) {
        await withSynchronizationDisabled(async () => {
            /* eslint-disable no-await-in-loop -- bounded scroll; waitFor(whileElement) can ignore withTimeout */
            // Inverted channel list: down travels toward older posts/intro, up toward newest.
            // Alternating directions nets ~0 movement and never reveals an off-screen row.
            const downCount = Math.ceil(maxScrolls / 2);
            for (let i = 0; i < maxScrolls; i++) {
                try {
                    await detoxExpect(target).toBeVisible(visibilityThreshold);
                    return;
                } catch {
                    const direction = i < downCount ? 'down' : 'up';
                    try {
                        await element(scrollContainer).scroll(200, direction, 0.5, 0.5);
                    } catch {
                        // List edge.
                    }
                    await wait(timeouts.HALF_SEC);
                }
            }
            /* eslint-enable no-await-in-loop */
        });
        await waitForElementToBeVisible(target, timeouts.FIVE_SEC, timeouts.HALF_SEC, visibilityThreshold);
        return;
    }

    /* eslint-disable no-await-in-loop */
    for (let i = 0; i < maxScrolls; i++) {
        try {
            await waitFor(target).toBeVisible(visibilityThreshold).withTimeout(timeouts.TWO_SEC);
            return;
        } catch {
            for (const direction of ['down', 'up'] as const) {
                try {
                    await waitFor(target).
                        toBeVisible(visibilityThreshold).
                        whileElement(scrollContainer).
                        scroll(250, direction);
                    return;
                } catch { /* try opposite direction */ }
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
        try {
            await scrollElementIntoView(target, scrollContainer);
        } catch (scrollError) {
            if (!isIos() || attempt === maxAttempts) {
                throw scrollError;
            }
            continue;
        }

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

        const pressAndAwaitSheet = async (): Promise<boolean> => {
            try {
                await target.longPress(pressDuration);
            } catch (pressError) {
                if (isIos() && attempt < maxAttempts && isIosHittableError(pressError)) {
                    return false;
                }
                throw pressError;
            }
            try {
                await waitForElementToExist(checkElement, timeouts.TEN_SEC);
                return true;
            } catch {
                if (attempt === maxAttempts) {
                    throw new Error(`Element did not appear after ${maxAttempts} longPress attempts`);
                }
                return false;
            }
        };

        // Keep sync off through the sheet wait. Re-enabling after the press lets
        // the next expect()/disableSynchronization() sit on a wedged idle timer.
        const opened = isIos() ? await withSynchronizationDisabled(pressAndAwaitSheet) : await pressAndAwaitSheet();
        if (opened) {
            return;
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

        const pressAndAwaitSheet = async (): Promise<boolean> => {
            try {
                await target.longPress(pressDuration);
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                await wait(timeouts.THREE_SEC);
                return false;
            }
            try {
                await waitForElementToExist(checkElement, timeouts.TEN_SEC);
                return true;
            } catch {
                if (attempt === maxAttempts) {
                    throw new Error(`Element did not appear after ${maxAttempts} longPress attempts`);
                }
                await wait(timeouts.THREE_SEC);
                return false;
            }
        };

        if (isIos()) {
            const opened = await withSynchronizationDisabled(pressAndAwaitSheet);
            if (opened) {
                return;
            }
            continue;
        }

        await device.disableSynchronization();
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
            await safeEnableSynchronization();
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

export async function tapUntilGone(
    target: Detox.NativeElement,
    goneElement?: Detox.NativeElement,
    maxAttempts = 3,
    timeout: number = timeouts.FIVE_SEC,
): Promise<void> {
    const toVanish = goneElement ?? target;
    let lastError: Error | undefined;

    /* eslint-disable no-await-in-loop -- sequential retries by design */
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await target.tap();
        } catch (error) {
            lastError = error as Error;
            if (attempt === maxAttempts) {
                throw error;
            }
            await wait(timeouts.ONE_SEC);
            continue;
        }

        try {
            await waitForElementToNotExist(toVanish, timeout);
            return;
        } catch (error) {
            lastError = error as Error;
            await wait(timeouts.ONE_SEC);
        }
    }
    /* eslint-enable no-await-in-loop */
    throw lastError;
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

export async function waitForElementToHaveText(
    detoxElement: Detox.NativeElement,
    text: string,
    timeout: number = timeouts.TEN_SEC,
    pollInterval: number = timeouts.HALF_SEC,
): Promise<void> {
    const {expect: detoxExpect} = require('detox');
    const startTime = Date.now();
    /* eslint-disable no-await-in-loop */
    while (Date.now() - startTime < timeout) {
        try {
            await detoxExpect(detoxElement).toHaveText(text);
            return;
        } catch (error) {
            if ((Date.now() - startTime) + pollInterval >= timeout) {
                throw error;
            }
            await wait(pollInterval);
        }
    }
    /* eslint-enable no-await-in-loop */
    await detoxExpect(detoxElement).toHaveText(text);
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
