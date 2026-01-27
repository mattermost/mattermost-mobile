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
    TEN_SEC: SECOND * 10,
    HALF_MIN: MINUTE / 2,
    ONE_MIN: MINUTE,
    TWO_MIN: MINUTE * 2,
    FOUR_MIN: MINUTE * 4,
};

/**
 * Retry a function with reload
 * @param {function} func - function to retry
 * @param {number} retries - number of retries
 * @return {Promise<void>} - promise that resolves when the function succeeds
 * @throws {Error} - if the function fails after the specified number of retries
 */
export async function retryWithReload(func: () => Promise<void>, retries: number = 2): Promise<void> {
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
                await new Promise((res) => setTimeout(res, 3000));
            } else {
                throw err;
            }
        }
    }
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
    timeout: number = timeouts.TEN_SEC,
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
