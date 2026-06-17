// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {adminEmail, adminPassword, adminUsername} from '@support/test_config';
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
                    // eslint-disable-next-line no-await-in-loop
                    await ServerScreen.connectToServer(serverUrl, serverDisplayName);
                }
            } else {
                throw err;
            }
        }
    }
}

// Long-press with scroll/swipe retry for flaky post-option gestures after keyboard dismiss.
export async function longPressWithScrollRetry(
    target: Detox.NativeElement,
    scrollTarget: Detox.NativeElement,
    checkElement: Detox.NativeElement,
    maxAttempts = 5,
): Promise<void> {
    /* eslint-disable no-await-in-loop */
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (isAndroid()) {
            try {
                await scrollTarget.swipe('down', 'slow', 0.2);
            } catch { /* ignore */ }
            try {
                await scrollTarget.scroll(100, 'down', 0.5, 0.5);
            } catch { /* ignore */ }
        }

        const waitDuration = isAndroid() ? timeouts.THREE_SEC : timeouts.FIVE_SEC;
        const pressDuration = isAndroid() ? timeouts.FOUR_SEC : timeouts.FIVE_SEC;
        await wait(waitDuration);

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

// Long-press retry without scrolling the list first.
export async function longPressWithRetry(
    target: Detox.NativeElement,
    checkElement: Detox.NativeElement,
    maxAttempts = 5,
): Promise<void> {
    /* eslint-disable no-await-in-loop */
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const pressDuration = isAndroid() ? timeouts.FOUR_SEC : timeouts.TWO_SEC;
        await target.longPress(pressDuration);
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
): Promise<void> {
    const {expect: detoxExpect} = require('detox');
    const startTime = Date.now();
    /* eslint-disable no-await-in-loop */
    while (Date.now() - startTime < timeout) {
        try {
            await detoxExpect(detoxElement).toBeVisible();
            return;
        } catch (error) {
            if ((Date.now() - startTime) + pollInterval >= timeout) {
                throw error;
            }
            await wait(pollInterval);
        }
    }
    /* eslint-enable no-await-in-loop */
    await detoxExpect(detoxElement).toBeVisible();
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
            if (!message.includes('ReactContext is null') || i === delays.length) {
                if (message.includes('ReactContext is null')) {
                    return;
                }
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
