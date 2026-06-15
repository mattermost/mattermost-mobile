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
 * Retry an element visibility check with exponential backoff
 * Helps handle race conditions during navigation and UI transitions
 * @param elementToCheck - Detox element to check visibility
 * @param timeout - Timeout for each attempt in milliseconds
 * @param maxAttempts - Maximum number of retry attempts
 */
export async function waitForVisibilityWithRetry(
    elementToCheck: Detox.NativeElement,
    timeout = 10000,
    maxAttempts = 3,
): Promise<void> {
    /* eslint-disable no-await-in-loop, no-console */
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await waitFor(elementToCheck).toBeVisible().withTimeout(timeout);
            return;
        } catch (error) {
            if (attempt === maxAttempts) {
                throw error;
            }

            console.warn(`[waitForVisibilityWithRetry] Attempt ${attempt}/${maxAttempts} failed, retrying...`);

            // Exponential backoff: 1s, 2s, 4s
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
    }
    /* eslint-enable no-await-in-loop, no-console */
}
